import { Container, Stack, Tabs, TextInput, Title, Text, Button, Group, Select, PasswordInput, Switch, MultiSelect, SegmentedControl, Paper, Badge, Radio, List, ThemeIcon } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useState, useEffect } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconCircleCheck, IconCircleOff, IconDownload, IconHistory, IconSettings, IconAlertCircle, IconCreditCard, IconCheck, IconCopy, IconPlus } from '@tabler/icons-react';
import { normalizeErrorString } from '@medplum/core';
import { Resource, Invoice, OperationOutcome } from '@medplum/fhirtypes';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProfileUsage } from '../hooks/useProfileUsage';

export function ProfilePage(): JSX.Element {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Resource;
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
  const stripePromise = loadStripe('pk_test_51QbTYlIhrZKLmPhepqAOfCYqEnOgCMXRbyJAxn5BBqECnJE3kupGQspkOj9h2hOkY8VbqLP0N4xwEnI6ixwpEfPK00qe2kNrOw');
  const [referencePreference, setReferencePreference] = useState<string>('client');
  const [quotePreference, setQuotePreference] = useState<string>('exclude');
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const location = useLocation();
  const defaultTab = location.state?.defaultTab || 'profile';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { usageData, upgradeToPro } = useProfileUsage();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      setFirstName(profile.name?.[0]?.given?.[0] || '');
      setLastName(profile.name?.[0]?.family || '');
      setEmail(profile.telecom?.find(t => t.system === 'email')?.value || '');
      const referenceExt = profile.extension?.find(
        e => e.url === 'https://progress.care/fhir/reference-preference'
      );
      setReferencePreference(referenceExt?.valueString || 'client');
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

  useEffect(() => {
    // Update active tab when location state changes
    if (location.state?.defaultTab) {
      setActiveTab(location.state.defaultTab);
    }
  }, [location.state]);

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

      await upgradeToPro();
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

  const handleBasicClone = async () => {
    try {
      // Check if we're running against localhost
      const isLocalhost = medplum.getBaseUrl().includes('localhost');
      if (!isLocalhost) {
        showNotification({
          title: 'Bot Not Available',
          message: 'Clone Project is only available when running against a local Medplum server. ' +
                  'You are currently running against app.medplum.com. ' +
                  'To use this feature, please run your own Medplum server locally.',
          color: 'yellow'
        });
        return;
      }

      console.log('Executing clone-project bot...');
      const result = await medplum.executeBot(
        {
          system: 'https://progressnotes.app',
          value: 'clone-project'
        },
        {
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'input',
              resource: {
                resourceType: 'Project',
                owner: { 
                  reference: profile.reference || `User/${profile.id}`,
                  display: profile.email
                }
              }
            }
          ]
        }
      );
      console.log('Bot execution result:', result);
      
      // Check if the result indicates an error
      if (result.status === 'error') {
        console.error('Bot execution debug log:');
        result.debugLog?.forEach((log, i) => console.log(`${i + 1}. ${log}`));
        console.error('Bot execution error details:', result.details);
        throw new Error(result.message || 'Clone operation failed');
      }

      // Log success details
      console.log('Bot execution debug log:');
      result.debugLog?.forEach((log, i) => console.log(`${i + 1}. ${log}`));

      showNotification({
        title: 'Success',
        message: 'Project cloned successfully. Check console for details.',
        color: 'green'
      });
    } catch (err) {
      console.error('Error executing bot:', err);
      
      // Handle bot execution result error
      if (err && typeof err === 'object' && 'status' in err && err.status === 'error') {
        const botError = err as { status: string; message: string; details: any; debugLog: string[] };
        console.error('Bot execution debug log:', botError.debugLog);
        console.error('Bot execution details:', botError.details);
        showNotification({
          title: 'Error',
          message: `Clone failed: ${botError.message}. Check console for details.`,
          color: 'red'
        });
        return;
      }

      // Handle HTTP response error
      const error = err as { response?: Response };
      if (error.response) {
        const text = await error.response.text();
        console.error('Error response:', text);
        try {
          const outcome = JSON.parse(text) as OperationOutcome;
          showNotification({
            title: 'Error',
            message: outcome.issue?.[0]?.diagnostics || 'Failed to execute basic clone',
            color: 'red'
          });
        } catch {
          showNotification({
            title: 'Error',
            message: text || 'Failed to execute basic clone',
            color: 'red'
          });
        }
      } else {
        showNotification({
          title: 'Error',
          message: err instanceof Error ? err.message : 'Failed to execute basic clone',
          color: 'red'
        });
      }
    }
  };

  const handleNewEncounter = () => {
    navigate('/new-encounter');
  };

  const handleNewPractitioner = () => {
    navigate('/new-practitioner');
  };

  const handleInvitePatient = () => {
    navigate('/invite', { state: { defaultRole: 'Patient' } });
  };

  return (
    <Container size="md" py="xl">
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="profile" icon={<IconSettings size={14} />}>Profile</Tabs.Tab>
          <Tabs.Tab value="note-preferences" icon={<IconAlertCircle size={14} />}>Note Preferences</Tabs.Tab>
          <Tabs.Tab value="billing" icon={<IconCreditCard size={14} />}>Billing</Tabs.Tab>
          <Tabs.Tab value="change-password" icon={<IconAlertCircle size={14} />}>Change Password</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile" pt="xl">
          <Stack gap="xl">
            <Group position="apart">
              <div>
                <Title order={2}>Profile Settings</Title>
                <Text c="dimmed">Manage your account information.</Text>
              </div>
              <Group position="right">
                <Button 
                  variant="filled"
                  color="blue"
                  leftIcon={<IconPlus size={16} />}
                  onClick={handleNewEncounter}
                >
                  New Encounter
                </Button>
                <Button 
                  variant="filled"
                  color="green"
                  leftIcon={<IconPlus size={16} />}
                  onClick={handleNewPractitioner}
                >
                  New Practitioner
                </Button>
                <Button 
                  variant="filled"
                  color="violet"
                  leftIcon={<IconPlus size={16} />}
                  onClick={handleInvitePatient}
                >
                  Invite Patient
                </Button>
                <Button 
                  variant="subtle"
                  leftIcon={<IconCopy size={16} />}
                  onClick={handleBasicClone}
                >
                  Clone Project
                </Button>
              </Group>
            </Group>

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
            <div>
              <Title order={2}>Billing</Title>
              <Text c="dimmed" mt={4}>Choose the plan that works best for you</Text>
            </div>

            {/* Plan Comparison */}
            <Group grow align="stretch">
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
                      <List.Item>Note generation</List.Item>
                      <List.Item>30-day storage</List.Item>
                    </List>
                  </div>
                  {!usageData.isPro && (
                    <Text size="sm" c="dimmed" ta="center">
                      {usageData.sessionsLimit - usageData.sessionsUsed} sessions remaining this month
                    </Text>
                  )}
                </Stack>
              </Paper>

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
                      <Text size="xl" fw={700}>$49.99</Text>
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
                    <Button
                      fullWidth
                      size="md"
                      onClick={handleSubscribe}
                      loading={loading}
                      leftSection={<IconCreditCard size={16} />}
                    >
                      Upgrade Now
                    </Button>
                  )}
                </Stack>
              </Paper>
            </Group>

            {/* Only show payment section if not pro */}
            {!usageData.isPro && (
              <Paper withBorder p="xl" mt="xl">
                <Stack gap="lg">
                  <div>
                    <Text size="lg" fw={500}>Payment Information</Text>
                    <Text size="sm" c="dimmed">Your subscription will start immediately after payment</Text>
                  </div>

                  <div>
                    <Text size="sm" fw={500} mb={8}>Card Details</Text>
                    <div 
                      id="card-element" 
                      style={{ 
                        padding: '12px',
                        border: '1px solid var(--mantine-color-gray-3)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--mantine-color-gray-0)'
                      }}
                    />
                  </div>

                  {error && (
                    <Text color="red" size="sm">
                      {error}
                    </Text>
                  )}
                </Stack>
              </Paper>
            )}

            {/* Payment History Section */}
            <Paper withBorder p="xl">
              <Stack gap="lg">
                <Title order={3}>Payment History</Title>
                
                {invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <Paper 
                      key={invoice.id} 
                      p="md" 
                      withBorder
                      style={{
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
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
                            variant="subtle"
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
                  ))
                ) : (
                  <Stack align="center" py="xl" spacing="xs">
                    <IconHistory size={32} style={{ color: 'var(--mantine-color-gray-5)' }} />
                    <Text c="dimmed">No payment history available</Text>
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="change-password" pt="xl">
          <form onSubmit={handlePasswordChange}>
            <Stack gap="xl">
              <Title order={2}>Change Password</Title>
              <Text c="dimmed">Update your account password</Text>

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
