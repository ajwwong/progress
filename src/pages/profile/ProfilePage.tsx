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
import { useProfileUsage } from '../../hooks/useProfileUsage';
import { ProfileSettings } from './components/ProfileSettings';
import { NotePreferences } from './components/NotePreferences';
import { BillingSection } from './components/BillingSection';
import { PasswordChange } from './components/PasswordChange';

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
    let mounted = true;

    if (!profile) {
      if (mounted) {
        setProfileLoading(false);
        // Reset all state when profile is null (during signout)
        setFirstName('');
        setLastName('');
        setEmail('');
        setReferencePreference('client');
        setQuotePreference('exclude');
        setSelectedInterventions([]);
      }
      return;
    }

    if (mounted) {
      setFirstName(profile.name?.[0]?.given?.[0] || '');
      setLastName(profile.name?.[0]?.family || '');
      setEmail(profile.telecom?.find(t => t.system === 'email')?.value || '');
      
      const referenceExt = profile.extension?.find(
        e => e.url === 'https://progress.care/fhir/reference-preference'
      );
      setReferencePreference(referenceExt?.valueString || 'client');
      
      const quoteExt = profile.extension?.find(
        e => e.url === 'https://progress.care/fhir/quote-preference'
      );
      setQuotePreference(quoteExt?.valueString || 'exclude');
      
      const interventionsExt = profile.extension?.find(
        e => e.url === 'https://progress.care/fhir/interventions'
      );
      if (interventionsExt?.valueString) {
        setSelectedInterventions(JSON.parse(interventionsExt.valueString));
      }
      
      setProfileLoading(false);
    }

    return () => {
      mounted = false;
    };
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
          <Tabs.Tab value="profile" icon={<IconSettings size={14} />}>
            Profile
          </Tabs.Tab>
          <Tabs.Tab value="note-preferences" icon={<IconAlertCircle size={14} />}>
            Note Preferences
          </Tabs.Tab>
          <Tabs.Tab value="billing" icon={<IconCreditCard size={14} />}>
            Billing
          </Tabs.Tab>
          <Tabs.Tab value="change-password" icon={<IconAlertCircle size={14} />}>
            Change Password
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile" pt="xl">
          <ProfileSettings />
        </Tabs.Panel>

        <Tabs.Panel value="note-preferences" pt="xl">
          <NotePreferences />
        </Tabs.Panel>

        <Tabs.Panel value="billing" pt="xl">
          <BillingSection />
        </Tabs.Panel>

        <Tabs.Panel value="change-password" pt="xl">
          <PasswordChange />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
