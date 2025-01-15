import { useState, useEffect } from 'react';
import { Container, Stack, Group, Title, Text, TextInput, Button, Select, Switch, SegmentedControl, MultiSelect, Tabs, PasswordInput, Paper, Badge } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { OperationOutcome, Invoice } from '@medplum/fhirtypes';
import { IconDownload, IconHistory, IconSettings, IconAlertCircle, IconCreditCard } from '@tabler/icons-react';
import { StripeConnect } from './provider/StripeConnect';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeElements } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe('your_publishable_key');

// Add this new component for the Billing tab
function BillingTab() {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Add useEffect to fetch invoices
  useEffect(() => {
    medplum.searchResources('Invoice', {
      _sort: '-date',
      _count: '10'
    }).then(setInvoices);
  }, [medplum]);

  useEffect(() => {
    // Initialize Stripe Elements
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

  const handleSubscribe = async () => {
    if (!stripe || !elements) {
      setError('Stripe has not been initialized');
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const cardElement = elements.getElement('card');
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create payment method
      const { paymentMethod, error: stripeError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Call your backend to create the subscription
      const response = await medplum.executeBot(
        'stripe-subscription-bot',
        { paymentMethodId: paymentMethod?.id },
        'application/json'
      );

      setSubscriptionActive(true);
      showNotification({
        title: 'Success',
        message: 'Your subscription has been activated',
        color: 'green',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing="xl">
      <Title order={2}>Billing</Title>
      <Text c="dimmed">Manage your subscription and payment methods</Text>

      {/* Subscription Section */}
      <Paper withBorder p="xl">
        <Stack spacing="lg">
          <Group position="apart">
            <div>
              <Text size="lg" fw={500}>Transcription Service Subscription</Text>
              <Text size="sm" c="dimmed">Monthly access to AI transcription services</Text>
            </div>
            <Badge color={subscriptionActive ? 'green' : 'gray'}>
              {subscriptionActive ? 'Active' : 'Inactive'}
            </Badge>
          </Group>

          <Text fw={500}>Price: $49.99/month</Text>

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

          <Button
            leftIcon={<IconCreditCard size={16} />}
            loading={loading}
            onClick={handleSubscribe}
            disabled={subscriptionActive}
          >
            {subscriptionActive ? 'Subscription Active' : 'Subscribe Now'}
          </Button>
        </Stack>
      </Paper>

      {/* Payment History Section */}
      <Paper withBorder p="xl">
        <Stack spacing="lg">
          <Title order={3}>Payment History</Title>
          
          {invoices.map((invoice) => (
            <Paper key={invoice.id} p="md" withBorder>
              <Group position="apart">
                <Stack spacing={4}>
                  <Text fw={500}>
                    {new Date(invoice.date || '').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                  <Text size="sm" c="dimmed">Invoice #{invoice.id}</Text>
                </Stack>
                <Group>
                  <Text fw={500}>${invoice.totalGross?.value?.toFixed(2)}</Text>
                  <Badge color="green">Paid</Badge>
                  <Button
                    variant="light"
                    size="sm"
                    leftIcon={<IconDownload size={16} />}
                    onClick={() => {
                      const paymentIntentId = invoice.identifier?.find(
                        id => id.system === 'https://stripe.com/payment_intent'
                      )?.value;

                      if (paymentIntentId) {
                        medplum.executeBot(
                          'stripe-invoice-download-bot-id',
                          { paymentIntentId },
                          'application/json'
                        ).then(response => {
                          if (response.url) {
                            window.open(response.url, '_blank');
                          }
                        });
                      }
                    }}
                  >
                    Download
                  </Button>
                </Group>
              </Group>
            </Paper>
          ))}
          
          {invoices.length === 0 && (
            <Text c="dimmed" ta="center" py="xl">
              No payment history available
            </Text>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

export function SettingsPage(): JSX.Element {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    medplum.searchResources('Invoice', {
      _sort: '-date',
      _count: '10'
    }).then(setInvoices)
      .finally(() => setLoading(false));
  }, [medplum]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }

       // Call Medplum's change password endpoint
       const response = await medplum.post('auth/changepassword', {
        oldPassword,
        newPassword
      });

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Password successfully changed');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container size="md" py="xl">
      <Tabs defaultValue="profile">
        <Tabs.List>
          <Tabs.Tab value="profile">Profile</Tabs.Tab>
          <Tabs.Tab value="note-preferences">Note Preferences</Tabs.Tab>
          <Tabs.Tab value="billing">Billing</Tabs.Tab>
          <Tabs.Tab value="change-password">Change Password</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile" pt="xl">
          <Stack spacing="xl">
            <Title order={2}>Settings</Title>
            <Text c="dimmed">Manage account preferences and note settings.</Text>

            <Group align="flex-start" spacing="xl">
              <Stack style={{ flex: 1 }}>
                <Title order={3}>Profile</Title>
                <Text c="dimmed">Personalize your experience.</Text>

                <TextInput
                  label="Email"
                  value="jjwong@gmail.com"
                  disabled
                />

                <TextInput
                  label="Name"
                  placeholder="Enter your name"
                  defaultValue="Albert Wong"
                />

                <TextInput
                  label="Title"
                  placeholder="Enter title"
                />

                <Select
                  label="Specialty"
                  placeholder="Enter your specialty"
                  data={[
                    'Psychotherapy',
                    'Counseling',
                    'Clinical Psychology',
                    'Psychiatry',
                    'Marriage and Family Therapy',
                    'Social Work',
                    'Substance Abuse Counseling',
                    'Child and Adolescent Psychology',
                    'Geriatric Psychology',
                    'Health Psychology',
                    'Neuropsychology',
                    'Forensic Psychology',
                    'Industrial-Organizational Psychology',
                    'School Psychology',
                    'Sports Psychology',
                    'Rehabilitation Psychology',
                    'Behavioral Psychology',
                    'Developmental Psychology',
                    'Educational Psychology',
                    'Environmental Psychology',
                    'Experimental Psychology',
                    'Military Psychology',
                    'Occupational Health Psychology'
                  ]}                />

                <Button color="blue">Save</Button>
              </Stack>
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="note-preferences" pt="xl">
          <Stack spacing="xl">
            <Title order={2}>Note preferences</Title>
            <Text c="dimmed">These settings will be applied to all future notes.</Text>

            <Stack spacing="md">
              <Text fw={500}>How do you refer to the person you are supporting?</Text>
              <SegmentedControl
                data={[
                  { label: 'Patient', value: 'patient' },
                  { label: 'Client', value: 'client' },
                ]}
              />

              <Text fw={500}>Would you like to include quotes in your notes?</Text>
              <SegmentedControl
                data={[
                  { label: 'Exclude quotes', value: 'exclude' },
                  { label: 'Include quotes', value: 'include' },
                ]}
              />

              <Text fw={500}>Interventions</Text>
              <MultiSelect
                data={[
                  'Acceptance and Commitment Therapy (ACT)',
                  'Cognitive Behavioral Therapy (CBT)',
                  'Dialectical Behavior Therapy (DBT)',
                  'Eye Movement Desensitization and Reprocessing (EMDR)',
                  'Psychodynamic Therapy',
                  'Interpersonal Therapy (IPT)',
                  'Mindfulness-Based Cognitive Therapy (MBCT)',
                  'Motivational Interviewing (MI)',
                  'Schema Therapy',
                  'Trauma-Focused Cognitive Behavioral Therapy (TF-CBT)',
                  'Art Therapy',
                  'Family Systems Therapy',
                  'Humanistic Therapy',
                  'Existential Therapy',
                  'Gestalt Therapy',
                  'Rational Emotive Behavior Therapy (REBT)',
                  'Solution-Focused Brief Therapy (SFBT)',
                  'Emotion-Focused Therapy (EFT)',
                  'Narrative Therapy',
                  'Play Therapy',
                  'Compassion-Focused Therapy (CFT)',
                  'Cognitive Processing Therapy (CPT)',
                  'Behavioral Activation (BA)',
                  'Attachment-Based Therapy',
                  'Adlerian Therapy',
                  'Client-Centered Therapy',
                  'Coherence Therapy',
                  'Dream Analysis',
                  'Forensic Psychotherapy',
                  'Functional Analytic Psychotherapy (FAP)',
                  'Group Therapy',
                  'Holistic Therapy',
                  'Hypnotherapy',
                  'Integrative Therapy',
                  'Jungian Therapy',
                  'Logotherapy',
                  'Neuro-Linguistic Programming (NLP)',
                  'Object Relations Therapy',
                  'Pastoral Counseling',
                  'Person-Centered Therapy',
                  'Positive Psychology',
                  'Prolonged Exposure Therapy',
                  'Psychoanalysis',
                  'Relational Therapy',
                  'Sensorimotor Psychotherapy',
                  'Somatic Experiencing',
                  'Supportive Therapy',
                  'Systemic Therapy',
                  'Transactional Analysis',
                  'Transpersonal Therapy'
                ]}
                placeholder="Search and select interventions"
                searchable
                maxSelectedValues={10}
                onChange={(selected) => console.log('Selected interventions:', selected)}
              />

              <Button color="blue">Save</Button>

              <Group position="apart" mt="md">
                <Text fw={500}>Include date & time for 'Copy note'</Text>
                <Switch label="When enabled, 'Copy Note' will include the date and time." />
              </Group>

              <Group position="apart">
                <Text fw={500}>Record storage settings</Text>
                <Switch label="Delete notes after 30 days" />
              </Group>
            </Stack>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="billing" pt="xl">
          <BillingTab />
        </Tabs.Panel>

        <Tabs.Panel value="change-password" pt="xl">
          <form onSubmit={handleSubmit}>
            <Stack spacing="xl">
              <Title order={2}>Change Password</Title>
              <Text c="dimmed">Update your account password.</Text>

              <PasswordInput
                label="Current Password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {error && <div style={{ color: 'red' }}>{error}</div>}
              <Button type="submit">Change Password</Button>
            </Stack>
          </form>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}