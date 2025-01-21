import { useState, useEffect } from 'react';
import { Container, Stack, Group, Title, Text, TextInput, Button, Select, Switch, SegmentedControl, MultiSelect, Tabs, PasswordInput, Paper, Badge } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { OperationOutcome, Invoice, Practitioner } from '@medplum/fhirtypes';
import { IconDownload, IconHistory, IconSettings, IconAlertCircle, IconCreditCard } from '@tabler/icons-react';
import { StripeConnect } from './provider/StripeConnect';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { showNotification } from '@mantine/notifications';
import { Radio } from '@mantine/core';

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
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
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
  const medplumProfile = useMedplumProfile();
  const profile = ((medplumProfile as unknown) as { profile: Practitioner })?.profile;
  const medplum = useMedplum();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('');
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      const profileName = profile.name?.[0];
      if (profileName) {
        setFirstName(profileName.given?.[0] || '');
        setMiddleName(profileName.given?.slice(1).join(' ') || '');
        setLastName(profileName.family || '');
      }
      setTitle(profile.qualification?.[0]?.identifier?.[0]?.value || '');
      setSpecialty(profile.qualification?.[0]?.code?.text || null);
    }
  }, [profile]);

  useEffect(() => {
    medplum.searchResources('Invoice', {
      _sort: '-date',
      _count: '10'
    }).then(setInvoices)
      .finally(() => setLoading(false));
  }, [medplum]);

  const handleProfileSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const givenNames = [firstName];
      if (middleName) {
        givenNames.push(...middleName.split(' '));
      }

      const updatedProfile = {
        ...profile,
        name: [{
          given: givenNames,
          family: lastName
        }],
        qualification: [{
          identifier: [{
            value: title
          }],
          code: {
            text: specialty || undefined
          }
        }]
      };

      await medplum.updateResource(updatedProfile);
      
      showNotification({
        title: 'Success',
        message: 'Profile updated successfully',
        color: 'green'
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      showNotification({
        title: 'Error',
        message: errorMessage,
        color: 'red'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      await medplum.post('auth/changepassword', {
        oldPassword,
        newPassword
      });

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotification({
        title: 'Success',
        message: 'Password changed successfully',
        color: 'green'
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
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
          <Stack gap="xl">
            <Title order={2}>Settings</Title>
            <Text c="dimmed">Manage account preferences and note settings.</Text>

            <Group align="flex-start" gap="xl">
              <Stack style={{ flex: 1 }} gap="md">
                <Title order={3}>Profile</Title>
                <Text c="dimmed">Personalize your experience.</Text>

                <TextInput
                  label="Email"
                  value={profile?.telecom?.[0]?.value || ''}
                  disabled
                />

                <TextInput
                  label="First Name"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />

                <TextInput
                  label="Middle Name(s)"
                  placeholder="Enter your middle name(s)"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />

                <TextInput
                  label="Last Name"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />

                <TextInput
                  label="Title"
                  placeholder="Enter title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <Select
                  label="Specialty"
                  placeholder="Enter your specialty"
                  value={specialty}
                  onChange={setSpecialty}
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
                  ]}
                />

                <Button 
                  color="blue" 
                  onClick={handleProfileSave}
                  loading={saving}
                  leftSection={<IconSettings size={16} />}
                >
                  Save Changes
                </Button>
              </Stack>
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="note-preferences" pt="xl">
          <Stack gap="xl">
            <Title order={2}>Note preferences</Title>
            <Text c="dimmed">These settings will be applied to all future notes.</Text>

            <Stack gap="md">
              <Text fw={500}>How do you refer to the person you are supporting?</Text>
              <Radio.Group>
                <Group gap="md">
                  <Radio label="Patient" value="patient" />
                  <Radio label="Client" value="client" />
                  <Radio label="Use their name" value="name" />
                </Group>
              </Radio.Group>

              <Text fw={500}>Would you like to include quotes in your notes?</Text>
              <Radio.Group>
                <Group gap="md">
                  <Radio label="Exclude quotes" value="exclude" />
                  <Radio label="Include quotes" value="include" />
                </Group>
              </Radio.Group>

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
                maxDropdownHeight={200}
                onChange={(selected) => console.log('Selected interventions:', selected)}
              />
            </Stack>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="billing" pt="xl">
          <Stack gap="xl">
            <Title order={2}>Billing</Title>
            <Text c="dimmed">View and manage your billing information.</Text>

            <Group justify="space-between">
              <Stack gap="md">
                <Title order={3}>Recent Invoices</Title>
                <Text c="dimmed">View your recent invoices.</Text>
              </Stack>
            </Group>

            {loading ? (
              <Text>Loading...</Text>
            ) : (
              <Stack gap="md">
                {invoices.map((invoice: any) => (
                  <Paper key={invoice.id} p="md" withBorder>
                    <Group justify="space-between">
                      <div>
                        <Text fw={500}>{invoice.id}</Text>
                        <Text size="sm" c="dimmed">
                          {new Date(invoice.date).toLocaleDateString()}
                        </Text>
                      </div>
                      <Button 
                        variant="light" 
                        size="sm"
                        leftSection={<IconDownload size={16} />}
                        onClick={() => console.log('Download invoice:', invoice.id)}
                      >
                        Download
                      </Button>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="change-password" pt="xl">
          <Stack gap="xl">
            <Title order={2}>Change Password</Title>
            <Text c="dimmed">Update your account password.</Text>

            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="Current Password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />

                <TextInput
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />

                <TextInput
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />

                {error && (
                  <Text c="red" size="sm">
                    {error}
                  </Text>
                )}

                <Button type="submit" color="blue">
                  Change Password
                </Button>
              </Stack>
            </form>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}