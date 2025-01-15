import { Container, Stack, Tabs, TextInput, Title, Text, Button, Group, Select, PasswordInput, Switch, MultiSelect, SegmentedControl } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useState, useEffect } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import { normalizeErrorString } from '@medplum/core';
import { Practitioner } from '@medplum/fhirtypes';
import { loadStripe } from '@stripe/stripe-js';

export function PractitionerPage(): JSX.Element {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Practitioner;
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const stripePromise = loadStripe('your_publishable_key');
  const [notePreferences, setNotePreferences] = useState({
    personReference: 'patient',
    includeQuotes: 'exclude',
    selectedInterventions: [] as string[],
    includeDatetime: false,
    deleteAfter30Days: false
  });

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
    setLoading(true);
    try {
      const updatedProfile = await medplum.updateResource({
        ...profile,
        name: [{
          ...profile.name?.[0],
          given: [profile.name?.[0]?.given?.[0] || ''],
          family: profile.name?.[0]?.family || ''
        }],
        telecom: [
          { system: 'email', value: profile.telecom?.find(t => t.system === 'email')?.value || '' },
          { system: 'phone', value: profile.telecom?.find(t => t.system === 'phone')?.value || '' }
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
    setError(undefined);

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNotePreferencesUpdate = async () => {
    setLoading(true);
    try {
      await medplum.updateResource({
        ...profile,
        extension: [
          {
            url: 'http://example.com/fhir/StructureDefinition/note-preferences',
            extension: [
              {
                url: 'personReference',
                valueString: notePreferences.personReference
              },
              {
                url: 'includeQuotes',
                valueString: notePreferences.includeQuotes
              },
              {
                url: 'interventions',
                valueString: notePreferences.selectedInterventions.join(',')
              },
              {
                url: 'includeDatetime',
                valueBoolean: notePreferences.includeDatetime
              },
              {
                url: 'deleteAfter30Days',
                valueBoolean: notePreferences.deleteAfter30Days
              }
            ]
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
          <Tabs.Tab value="change-password">Change Password</Tabs.Tab>
          <Tabs.Tab value="billing">Billing</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile" pt="xl">
          <form onSubmit={(e) => {
            e.preventDefault();
            handleProfileUpdate();
          }}>
            <Stack spacing="xl">
              <Title order={2}>Profile Settings</Title>
              <Text c="dimmed">Manage your account information.</Text>

              <Group align="flex-start" spacing="xl">
                <Stack style={{ flex: 1 }}>
                  <TextInput
                    label="Email"
                    value={profile.telecom?.find(t => t.system === 'email')?.value || ''}
                    disabled
                  />

                  <TextInput
                    label="Name"
                    defaultValue={profile.name?.[0]?.given?.[0] || ''}
                  />

                  <TextInput
                    label="Title"
                    defaultValue={profile.name?.[0]?.prefix?.[0] || ''}
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
                    defaultValue={profile.qualification?.[0]?.code?.text}
                  />

                  <Button type="submit" color="blue" loading={loading}>
                    Save Changes
                  </Button>
                </Stack>
              </Group>
            </Stack>
          </form>
        </Tabs.Panel>

        <Tabs.Panel value="note-preferences" pt="xl">
          <Stack spacing="xl">
            <Title order={2}>Note preferences</Title>
            <Text c="dimmed">These settings will be applied to all future notes.</Text>

            <Stack spacing="md">
              <Text fw={500}>How do you refer to the person you are supporting?</Text>
              <SegmentedControl
                value={notePreferences.personReference}
                onChange={(value) => setNotePreferences(prev => ({ ...prev, personReference: value }))}
                data={[
                  { label: 'Patient', value: 'patient' },
                  { label: 'Client', value: 'client' },
                ]}
              />

              <Text fw={500}>Would you like to include quotes in your notes?</Text>
              <SegmentedControl
                value={notePreferences.includeQuotes}
                onChange={(value) => setNotePreferences(prev => ({ ...prev, includeQuotes: value }))}
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
                  'Trauma-Focused Cognitive Behavioral Therapy (TF-CBT)'
                ]}
                placeholder="Search and select interventions"
                searchable
                maxSelectedValues={10}
                value={notePreferences.selectedInterventions}
                onChange={(selected) => setNotePreferences(prev => ({ ...prev, selectedInterventions: selected }))}
              />

              <Group position="apart" mt="md">
                <Text fw={500}>Include date & time for 'Copy note'</Text>
                <Switch 
                  checked={notePreferences.includeDatetime}
                  onChange={(event) => setNotePreferences(prev => ({ ...prev, includeDatetime: event.currentTarget.checked }))}
                  label="When enabled, 'Copy Note' will include the date and time." 
                />
              </Group>

              <Group position="apart">
                <Text fw={500}>Record storage settings</Text>
                <Switch 
                  checked={notePreferences.deleteAfter30Days}
                  onChange={(event) => setNotePreferences(prev => ({ ...prev, deleteAfter30Days: event.currentTarget.checked }))}
                  label="Delete notes after 30 days" 
                />
              </Group>

              <Button 
                color="blue" 
                onClick={handleNotePreferencesUpdate} 
                loading={loading}
              >
                Save
              </Button>
            </Stack>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="change-password" pt="xl">
          <form onSubmit={handlePasswordChange}>
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
              {error && <Text color="red">{error}</Text>}
              <Button type="submit">Change Password</Button>
            </Stack>
          </form>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
