import { Modal, Stack, TextInput, Button, Text, Group } from '@mantine/core';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { useState, useEffect } from 'react';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Patient } from '@medplum/fhirtypes';
import { showNotification } from '@mantine/notifications';

const stripePromise = loadStripe('your_publishable_key');

interface PaymentMethodModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentMethodModal({ opened, onClose, onSuccess }: PaymentMethodModalProps) {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Patient;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (opened) {
      const initStripe = async () => {
        const stripe = await stripePromise;
        if (!stripe) {
          setError('Failed to load Stripe');
          return;
        }

        const elements = stripe.elements();
        const card = elements.create('card');
        card.mount('#card-element');
        card.on('change', (event) => {
          setError(event.error ? event.error.message : undefined);
        });

        setStripe(stripe);
        setElements(elements);
      };

      initStripe();
    }

    return () => {
      if (elements) {
        const card = elements.getElement('card');
        if (card) {
          card.unmount();
        }
      }
    };
  }, [opened]);

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      setError('Stripe has not been initialized');
      return;
    }

    try {
      setLoading(true);
      setError(undefined);

      const cardElement = elements.getElement('card');
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { paymentMethod, error: stripeError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { name }
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }

      // Store payment method in Medplum
      await medplum.createResource({
        resourceType: 'PaymentMethod',
        status: 'active',
        subject: { reference: `Patient/${profile.id}` },
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/payment-type',
            code: 'cc',
            display: 'Credit Card'
          }]
        },
        identifier: [{
          system: 'https://stripe.com',
          value: paymentMethod.id
        }]
      });

      showNotification({
        title: 'Success',
        message: 'Payment method saved successfully',
        color: 'green'
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Payment Method">
      <Stack spacing="md">
        <TextInput
          label="Cardholder Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div>
          <Text size="sm" fw={500} mb={8}>Card Information</Text>
          <div 
            id="card-element" 
            style={{ 
              padding: '10px',
              border: '1px solid #ced4da',
              borderRadius: '4px'
            }}
          />
        </div>

        {error && (
          <Text color="red" size="sm">
            {error}
          </Text>
        )}

        <Text size="xs" c="dimmed">
          Your payment information is securely processed by Stripe.
        </Text>

        <Group position="right" mt="md">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            loading={loading}
            disabled={!name}
          >
            Save Payment Method
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
} 