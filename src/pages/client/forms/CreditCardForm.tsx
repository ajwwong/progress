import { Title, Paper, Stack, Button, Group, Text, TextInput } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Patient } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCreditCard } from '@tabler/icons-react';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeElements } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe('your_publishable_key'); // Replace with your Stripe publishable key

export function CreditCardForm() {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Patient;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [formData, setFormData] = useState({
    cardholderName: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: ''
  });

  useEffect(() => {
    // Initialize Stripe
    const initStripe = async () => {
      const stripe = await stripePromise;
      if (!stripe) {
        setError('Failed to load Stripe');
        return;
      }

      const elements = stripe.elements();
      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
              color: '#aab7c4',
            },
          },
          invalid: {
            color: '#9e2146',
          },
        }
      });

      // Mount the card element
      card.mount('#card-element');

      // Handle validation errors
      card.on('change', (event) => {
        if (event.error) {
          setError(event.error.message);
        } else {
          setError(undefined);
        }
      });

      setStripe(stripe);
      setElements(elements);
    };

    initStripe();

    // Cleanup
    return () => {
      if (elements) {
        const card = elements.getElement('card');
        if (card) {
          card.unmount();
        }
      }
    };
  }, []);

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

      // Create a payment method
      const { paymentMethod, error: stripeError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: formData.cardholderName,
          address: {
            line1: formData.billingAddress,
            city: formData.billingCity,
            state: formData.billingState,
            postal_code: formData.billingZip
          }
        }
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }

      // Store only the payment method ID in Medplum
      const paymentInfo = {
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
      };

      await medplum.createResource(paymentInfo);
      navigate('/portal/forms');
    } catch (err) {
      console.error('Error saving payment information:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing="lg">
      <Group spacing="xs">
        <IconCreditCard size={24} />
        <Title order={2}>Payment Information</Title>
      </Group>

      <Paper p="xl" withBorder>
        <Stack spacing="md">
          <TextInput
            label="Cardholder Name"
            required
            value={formData.cardholderName}
            onChange={(e) => setFormData(prev => ({ ...prev, cardholderName: e.target.value }))}
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

          <Title order={3} size="h5" mt="lg">Billing Address</Title>
          
          <TextInput
            label="Street Address"
            required
            value={formData.billingAddress}
            onChange={(e) => setFormData(prev => ({ ...prev, billingAddress: e.target.value }))}
          />

          <Group grow>
            <TextInput
              label="City"
              required
              value={formData.billingCity}
              onChange={(e) => setFormData(prev => ({ ...prev, billingCity: e.target.value }))}
            />
            <TextInput
              label="State"
              required
              value={formData.billingState}
              onChange={(e) => setFormData(prev => ({ ...prev, billingState: e.target.value }))}
            />
            <TextInput
              label="ZIP Code"
              required
              value={formData.billingZip}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                setFormData(prev => ({ ...prev, billingZip: value }));
              }}
              maxLength={5}
            />
          </Group>

          {error && (
            <Text color="red" size="sm">
              {error}
            </Text>
          )}

          <Text size="xs" c="dimmed" mt="md">
            Your payment information is securely processed by Stripe. We never store your complete card details.
          </Text>

          <Group position="right" mt="xl">
            <Button variant="light" onClick={() => navigate('/portal/forms')}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              loading={loading}
              disabled={
                !formData.cardholderName ||
                !formData.billingAddress ||
                !formData.billingCity ||
                !formData.billingState ||
                formData.billingZip.length < 5
              }
            >
              Save Payment Information
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}