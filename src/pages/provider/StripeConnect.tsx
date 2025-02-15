import { Title, Paper, Stack, Button, Text, Group } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Practitioner } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';
import { IconCreditCard } from '@tabler/icons-react';
import { loadStripe } from '@stripe/stripe-js';

// Use a different key for Stripe Connect
const stripeConnectPromise = loadStripe(import.meta.env.VITE_STRIPE_CONNECT_PUBLISHABLE_KEY);

export function StripeConnect() {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Practitioner;
  const [stripeConnected, setStripeConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if provider has connected Stripe account
    medplum.searchResources('Organization', {
      identifier: `https://stripe.com/connect|${profile.id}`,
    }).then(orgs => {
      setStripeConnected(orgs.length > 0);
      setLoading(false);
    });
  }, [medplum, profile.id]);

  const handleConnectStripe = async () => {
    try {
      // Call Medplum bot to get Stripe Connect URL
      const response = await medplum.executeBot(
        'stripe-connect-bot-id', // Replace with your bot ID
        { practitionerId: profile.id },
        'application/json'
      );

      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error connecting to Stripe:', error);
    }
  };

  if (loading) return null;

  return (
    <Stack spacing="lg">
      <Title order={2}>Payment Processing</Title>

      <Paper p="xl" withBorder>
        <Stack spacing="md">
          <Group>
            <IconCreditCard size={24} />
            <Title order={3}>Stripe Integration</Title>
          </Group>

          {stripeConnected ? (
            <>
              <Text color="green" fw={500}>
                Your Stripe account is connected and ready to process payments
              </Text>
              <Text size="sm" c="dimmed">
                You can manage your Stripe account and view your payouts in the Stripe dashboard
              </Text>
              <Button 
                component="a"
                href="https://dashboard.stripe.com"
                target="_blank"
                variant="light"
              >
                Open Stripe Dashboard
              </Button>
            </>
          ) : (
            <>
              <Text>
                Connect your Stripe account to start accepting payments from clients
              </Text>
              <Text size="sm" c="dimmed">
                Stripe handles all payment processing securely. You'll receive payouts directly to your bank account.
              </Text>
              <Button onClick={handleConnectStripe}>
                Connect Stripe Account
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}