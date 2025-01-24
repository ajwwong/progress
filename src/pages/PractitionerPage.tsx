import { Container, Stack, Tabs, TextInput, Title, Text, Button, Group, Select, PasswordInput, Switch, MultiSelect, SegmentedControl, Paper, Badge, Radio } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useState, useEffect } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconCircleCheck, IconCircleOff, IconDownload, IconHistory, IconSettings, IconAlertCircle, IconCreditCard } from '@tabler/icons-react';
import { normalizeErrorString } from '@medplum/core';
import { Practitioner, Invoice } from '@medplum/fhirtypes';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeElements } from '@stripe/stripe-js';

export function PractitionerPage(): JSX.Element {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Practitioner | undefined;
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const stripePromise = loadStripe('your_publishable_key');
  const [referencePreference, setReferencePreference] = useState<string>('patient');
  const [quotePreference, setQuotePreference] = useState<string>('exclude');
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.name?.[0]?.given?.[0] || '');
      setLastName(profile.name?.[0]?.family || '');
      setEmail(profile.telecom?.find(t => t.system === 'email')?.value || '');
      setReferencePreference(profile.extension?.find(e => e.url === 'https://progress.care/fhir/reference-preference')?.valueString || 'patient');
      setQuotePreference(profile.extension?.find(e => e.url === 'https://progress.care/fhir/quote-preference')?.valueString || 'exclude');
      const interventionsExt = profile.extension?.find(e => e.url === 'https://progress.care/fhir/interventions');
      if (interventionsExt?.valueString) {
        setSelectedInterventions(JSON.parse(interventionsExt.valueString));
      }
      setProfileLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    medplum.searchResources('Invoice', {
      _sort: '-date',
      _count: '10'
    }).then(setInvoices);
  }, [medplum]);

  useEffect(() => {
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

      card.mount('#card-element');
      setStripe(stripe);
      setElements(elements);
    };

    initStripe();

    return () => {
      if (elements) {
        const card = elements.getElement('card');
        if (card) {
          card.unmount();
        }
      }
    };
  }, []);

  const handleProfileUpdate = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const updatedProfile = await medplum.updateResource({
        ...profile,
        name: [{
          ...profile.name?.[0],
          given: [firstName],
          family: lastName
        }],
        telecom: [
          { system: 'email', value: email },
          ...(profile.telecom?.filter(t => t.system !== 'email') || [])
        ]
      });

      showNotification({
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Profile updated successfully'
      });
    } catch (err) {
      showNotification({
        color: 'red',
        icon: <IconCircleOff />,
        title: 'Error',
        message: normalizeErrorString(err)
      });
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
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
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Password changed successfully'
      });
    } catch (err) {
      setError(normalizeErrorString(err));
    }
  };

  const handleSubscribe = async () => {
    if (!stripe || !elements) {
      setError('Stripe has not been initialized');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cardElement = elements.getElement('card');
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { paymentMethod, error: stripeError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

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
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNotePreferencesUpdate = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const updatedProfile = await medplum.updateResource({
        ...profile,
        extension: [
          ...(profile.extension?.filter(e => 
            e.url !== 'https://progress.care/fhir/reference-preference' && 
            e.url !== 'https://progress.care/fhir/quote-preference' &&
            e.url !== 'https://progress.care/fhir/interventions'
          ) || []),
          {
            url: 'https://progress.care/fhir/reference-preference',
            valueString: referencePreference
          },
          {
            url: 'https://progress.care/fhir/quote-preference',
            valueString: quotePreference
          },
          {
            url: 'https://progress.care/fhir/interventions',
            valueString: JSON.stringify(selectedInterventions)
          }
        ]
      });

      showNotification({
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Note preferences updated successfully'
      });
    } catch (err) {
      showNotification({
        color: 'red',
        icon: <IconCircleOff />,
        title: 'Error',
        message: normalizeErrorString(err)
      });
    }
    setLoading(false);
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
            <Title order={2}>Profile Settings</Title>
            <Text c="dimmed">Manage your account information.</Text>

            {profileLoading ? (
              <Text>Loading profile...</Text>
            ) : (
              <Group align="flex-start" gap="xl">
                <Stack style={{ flex: 1 }}>
                  <TextInput
                    label="Email"
                    value={email}
                    disabled
                  />

                  <TextInput
                    label="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                  />

                  <TextInput
                    label="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                  />

                  <Select
                    label="Specialty"
                    placeholder="Select specialty"
                    data={[
                      'Psychotherapy',
                      'Counseling',
                      'Clinical Psychology',
                      'Psychiatry',
                      'Marriage and Family Therapy'
                    ]}
                    defaultValue={profile?.qualification?.[0]?.code?.text}
                  />

                  <Button color="blue" onClick={handleProfileUpdate} loading={loading}>
                    Save Changes
                  </Button>
                </Stack>
              </Group>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="note-preferences" pt="xl">
          <Stack gap="xl">
            <Title order={2}>Note preferences</Title>
            <Text c="dimmed">These settings will be applied to all future notes.</Text>

            <Stack gap="md">
              <Text fw={500}>How do you refer to the person you are supporting?</Text>
              <Radio.Group value={referencePreference} onChange={setReferencePreference}>
                <Group>
                  <Radio label="Patient" value="patient" />
                  <Radio label="Client" value="client" />
                  <Radio label="Use their name" value="name" />
                </Group>
              </Radio.Group>

              <Text fw={500}>Would you like to include quotes in your notes?</Text>
              <Radio.Group value={quotePreference} onChange={setQuotePreference}>
                <Group>
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
                  'Solution-Focused Brief Therapy (SFBT)'
                ]}
                placeholder="Search and select interventions"
                searchable
                maxDropdownHeight={200}
                value={selectedInterventions}
                onChange={setSelectedInterventions}
              />

              <Button color="blue" onClick={handleNotePreferencesUpdate} loading={loading}>
                Save Note Preferences
              </Button>

              <Group justify="apart" mt="md">
                <Text fw={500}>Include date & time for 'Copy note'</Text>
                <Switch label="When enabled, 'Copy Note' will include the date and time." />
              </Group>

              <Group justify="apart">
                <Text fw={500}>Record storage settings</Text>
                <Switch label="Delete notes after 30 days" />
              </Group>
            </Stack>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="billing" pt="xl">
          <Stack gap="xl">
            <Title order={2}>Billing</Title>
            <Text c="dimmed">Manage your subscription and payment methods</Text>

            {/* Subscription Section */}
            <Paper withBorder p="xl">
              <Stack gap="lg">
                <Group justify="apart">
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
                  leftSection={<IconCreditCard size={16} />}
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
              <Stack gap="lg">
                <Title order={3}>Payment History</Title>
                
                {invoices.map((invoice) => (
                  <Paper key={invoice.id} p="md" withBorder>
                    <Group justify="apart">
                      <Stack gap={4}>
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
                          leftSection={<IconDownload size={16} />}
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
        </Tabs.Panel>

        <Tabs.Panel value="change-password" pt="xl">
          <form onSubmit={handlePasswordChange}>
            <Stack gap="xl">
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
              {error && <Text color="red">{error}</Text>}
              <Button type="submit">Change Password</Button>
            </Stack>
          </form>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
