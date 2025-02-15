import { Stack, Title, Text, Paper, Button, Badge, Group, List, ThemeIcon } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { useState, useEffect } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconDownload, IconHistory, IconCheck, IconCreditCard } from '@tabler/icons-react';
import { Invoice, Practitioner } from '@medplum/fhirtypes';
import { useStripeSetup } from '../hooks/useStripeSetup';
import { useProfileUsage } from '../../../hooks/useProfileUsage';
import { StripeCardElement } from './StripeCardElement';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMedplumProfile } from '@medplum/react';
import { Communication } from '@medplum/fhirtypes';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export function BillingSection(): JSX.Element {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Practitioner;
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [subscriptionLogs, setSubscriptionLogs] = useState<Communication[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { stripe, elements, error: stripeError, isReady } = useStripeSetup();
  const { usageData, upgradeToPro } = useProfileUsage();
  const [cardElement, setCardElement] = useState<any>(null);

  useEffect(() => {
    medplum.searchResources('Invoice', {
      _sort: '-date',
      _count: '10'
    }).then(setInvoices);
  }, [medplum]);

  useEffect(() => {
    // Get profile on mount
    const getProfile = async () => {
      try {
        const userProfile = await medplum.getProfile();
        setProfile(userProfile);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Failed to load user profile');
      }
    };
    
    getProfile();
  }, [medplum]);

  useEffect(() => {
    if (!stripe || cardElement) return;

    console.log('🔄 Initializing Stripe Elements...');
    const elements = stripe.elements();
    const card = elements.create('card', {
      style: {
        base: {
          color: '#32325d',
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          fontSmoothing: 'antialiased',
          fontSize: '16px',
          '::placeholder': {
            color: '#aab7c4'
          }
        },
        invalid: {
          color: '#fa755a',
          iconColor: '#fa755a'
        }
      }
    });

    console.log('💳 Mounting card element...');
    card.mount('#card-element');

    card.on('change', (event) => {
      console.log('🔄 Card input changed:', {
        empty: event.empty,
        complete: event.complete,
        error: event.error?.message
      });
      
      if (event.error) {
        setError(event.error.message);
      } else {
        setError('');
      }
    });

    setCardElement(card);
    console.log('✅ Card element setup complete');

    return () => {
      console.log('🧹 Cleaning up card element...');
      if (card) {
        card.unmount();
        setCardElement(null);
      }
    };
  }, [stripe]);

  // Add the fetchSubscriptionLogs function
  const fetchSubscriptionLogs = async () => {
    try {
      console.log('Fetching subscription logs for profile:', profile.id);
      const logs = await medplum.searchResources('Communication', {
        sender: 'Bot/42b0ee1a-345b-4fd0-aa41-2493434af9e9',
        subject: `Practitioner/${profile.id}`,
        _sort: '-sent',
        _count: '10'
      });
      console.log('Received logs:', logs);
      setSubscriptionLogs(logs);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log('🚀 Starting subscription process...');
    
    if (!stripe || !cardElement) {
      console.log('❌ Validation failed:', { 
        stripeLoaded: !!stripe, 
        cardElementExists: !!cardElement 
      });
      setError('Stripe has not been initialized');
      return;
    }

    if (!profile || !profile.id) {
      console.log('❌ Profile validation failed:', { 
        profileExists: !!profile, 
        profileId: profile?.id 
      });
      setError('User profile not found');
      return;
    }

    setLoading(true);
    setError('');
    console.log('👤 Processing for profile:', profile.id);

    try {
      console.log('💳 Creating payment method...');
      const { paymentMethod, error: paymentError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (paymentError) {
        console.error('❌ Payment method creation failed:', paymentError);
        throw new Error(paymentError.message);
      }

      console.log('✅ Payment method created:', paymentMethod?.id);

      console.log('🤖 Executing echo bot...');
      const response = await medplum.executeBot(
        '42b0ee1a-345b-4fd0-aa41-2493434af9e9',
        {
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'paymentMethodId',
              valueString: paymentMethod?.id
            },
            {
              name: 'customerId',
              valueString: profile.id
            }
          ]
        }
      );
      console.log('🤖 Bot response:', response);

      if (response.resourceType === 'OperationOutcome') {
        console.error('❌ Bot returned error:', response);
        throw new Error(response.issue?.[0]?.details?.text || 'Subscription failed');
      }

      if (response.parameter?.find(p => p.name === 'status')?.valueString === 'requires_confirmation') {
        const clientSecret = response.parameter?.find(p => p.name === 'clientSecret')?.valueString;
        if (clientSecret) {
          const result = await stripe.confirmCardPayment(clientSecret);
          if (result.error) {
            throw new Error(result.error.message);
          }
        }
      }

      console.log('✅ Subscription created successfully');
      showNotification({
        title: 'Success',
        message: 'Your subscription has been activated',
        color: 'green',
      });

      await fetchSubscriptionLogs();

    } catch (err) {
      console.error('❌ Subscription error:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      await fetchSubscriptionLogs();
    } finally {
      console.log('🏁 Subscription process completed');
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoice: Invoice) => {
    // Implementation for downloading invoice
    console.log('Downloading invoice:', invoice);
  };

  // Show loading state while profile is being fetched
  if (medplum.isLoading()) {
    return <Loading />;
  }

  // Show error if no profile
  if (!profile) {
    return <div>Error: Unable to load user profile</div>;
  }

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Billing</Title>
        <Text c="dimmed" mt={4}>Choose the plan that works best for you</Text>
      </div>

      <Group grow align="stretch">
        {/* Free Plan */}
        <Paper 
          withBorder 
          p="xl" 
          style={{ 
            opacity: usageData.isPro ? 0.6 : 1,
            transition: 'all 0.2s ease',
            position: 'relative',
            height: '100%'
          }}
        >
          <Stack justify="space-between" h="100%">
            <div>
              <Badge color="gray" variant="light" size="lg" mb="md">Free Plan</Badge>
              <Group align="flex-end" spacing="xs" mb="md">
                <Text size="xl" fw={700}>$0</Text>
                <Text size="sm" c="dimmed" mb={4}>/month</Text>
              </Group>
              <Text c="dimmed" mb="xl">Perfect for getting started</Text>
              <List
                spacing="sm"
                center
                icon={
                  <ThemeIcon color="gray" size={20} radius="xl">
                    <IconCheck size={12} />
                  </ThemeIcon>
                }
              >
                <List.Item>10 sessions per month</List.Item>
                <List.Item>Basic transcription</List.Item>
                <List.Item>Email support</List.Item>
                <List.Item>1GB storage</List.Item>
              </List>
            </div>
          </Stack>
        </Paper>

        {/* Pro Plan */}
        <Paper 
          withBorder 
          p="xl"
          style={{ 
            position: 'relative',
            transform: 'scale(1.02)',
            border: usageData.isPro ? '2px solid var(--mantine-color-blue-6)' : undefined,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            height: '100%',
            transition: 'all 0.2s ease'
          }}
        >
          {usageData.isPro && (
            <Badge 
              color="blue"
              variant="filled"
              style={{ 
                position: 'absolute',
                top: -12,
                right: 20
              }}
            >
              Current Plan
            </Badge>
          )}
          <Stack justify="space-between" h="100%">
            <div>
              <Badge color="blue" variant="light" size="lg" mb="md">Pro Plan</Badge>
              <Group align="flex-end" spacing="xs" mb="md">
                <Text size="xl" fw={700}>$0.99</Text>
                <Text size="sm" c="dimmed" mb={4}>/month</Text>
              </Group>
              <Text c="dimmed" mb="xl">For professionals who need more</Text>
              <List
                spacing="sm"
                center
                icon={
                  <ThemeIcon color="blue" size={20} radius="xl">
                    <IconCheck size={12} />
                  </ThemeIcon>
                }
              >
                <List.Item>Unlimited sessions</List.Item>
                <List.Item>Advanced transcription</List.Item>
                <List.Item>Priority support</List.Item>
                <List.Item>Extended storage</List.Item>
                <List.Item>Custom templates</List.Item>
                <List.Item>Priority processing</List.Item>
              </List>
            </div>
            {!usageData.isPro && (
              <Elements stripe={stripePromise}>
                <form onSubmit={handleSubscribe}>
                  <StripeCardElement 
                    onChange={(event) => {
                      if (event.error) {
                        setError(event.error.message);
                      } else {
                        setError('');
                      }
                    }}
                  />
                  {error && <Text color="red">{error}</Text>}
                  <Button 
                    type="submit"
                    loading={loading}
                    disabled={!isReady || !profile}
                  >
                    {isReady ? 'Subscribe Now' : 'Loading payment form...'}
                  </Button>
                </form>
              </Elements>
            )}
          </Stack>
        </Paper>
      </Group>

      {/* Payment History Section */}
      <Paper withBorder p="xl">
        <Group position="apart" mb="xl">
          <div>
            <Title order={3}>Payment History</Title>
            <Text c="dimmed">View and download your past invoices</Text>
          </div>
          <IconHistory size={24} color="gray" />
        </Group>

        {invoices.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">No payment history available</Text>
        ) : (
          <Stack gap="md">
            {invoices.map((invoice) => (
              <Group key={invoice.id} position="apart" p="md" style={{ border: '1px solid #eee', borderRadius: '4px' }}>
                <div>
                  <Text>Invoice #{invoice.id}</Text>
                  <Text size="sm" c="dimmed">{new Date(invoice.date || '').toLocaleDateString()}</Text>
                </div>
                <Button 
                  variant="subtle" 
                  onClick={() => downloadInvoice(invoice)}
                  leftSection={<IconDownload size={16} />}
                >
                  Download
                </Button>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>

      {subscriptionLogs.length > 0 && (
        <Paper withBorder p="md">
          <Title order={3}>Subscription Logs</Title>
          <Stack>
            {subscriptionLogs.map((log) => (
              <Paper key={log.id} withBorder p="xs">
                <Text>{log.payload?.[0]?.contentString}</Text>
                {log.payload?.[1]?.contentString && (
                  <Text size="sm" color="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                    {log.payload[1].contentString}
                  </Text>
                )}
                <Text size="xs" color="dimmed">
                  {new Date(log.sent || '').toLocaleString()}
                </Text>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
