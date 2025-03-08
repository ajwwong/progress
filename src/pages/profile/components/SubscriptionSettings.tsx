import { Button, Group, Paper, Stack, Text, List, ThemeIcon, Alert, Card, Badge, Title, TextInput, Select, Grid } from '@mantine/core';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Organization } from '@medplum/fhirtypes';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { IconCheck, IconEdit, IconX } from '@tabler/icons-react';
import { STRIPE_CONFIG } from '../../../config/stripe-config';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckoutForm } from './subscription/CheckoutForm';
import { ExtensionEditor } from './subscription/ExtensionEditor';
import { PaymentStatusAlert } from './subscription/PaymentStatusAlert';
import { OrganizationCard } from './subscription/OrganizationCard';
import { SubscriptionCard } from './subscription/SubscriptionCard';
import { getSubscriptionInfo } from './subscription/utils';
import { SubscriptionInfo } from './subscription/types';
import { PlanCard } from './subscription/PlanCard';
import { CurrentSubscription } from './subscription/CurrentSubscription';
import { showNotification } from '@mantine/notifications';

// Initialize Stripe outside of component
const stripePromise = loadStripe('pk_test_jIqc6QAfldl6cJQ2zemJUGlv');

// Helper function to validate client secret format
function isValidClientSecret(secret: string): boolean {
  // Stripe client secret format: pi_XXX_secret_XXX or seti_XXX_secret_XXX
  const validPattern = /^(pi|seti)_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/;
  return validPattern.test(secret);
}

// Main subscription component
export function SubscriptionSettings(): JSX.Element {
  const [clientSecret, setClientSecret] = useState('');
  const [organization, setOrganization] = useState<Organization>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | undefined>();
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [stripeReady, setStripeReady] = useState(false);
  const [elementsReady, setElementsReady] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<typeof SUBSCRIPTION_PLANS[0] | null>(null);

  // Handle redirect result
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const redirectStatus = searchParams.get('redirect_status');
    const paymentIntent = searchParams.get('payment_intent');

    if (redirectStatus) {
      setPaymentStatus(redirectStatus === 'succeeded' ? 'success' : 'failed');
      // Clear URL parameters while keeping the tab parameter
      const newParams = new URLSearchParams();
      newParams.set('tab', 'subscription');
      navigate(`/settings?${newParams.toString()}`, { replace: true });
    }
  }, [location, navigate]);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      // First check profile's meta.compartment
      const orgReference = profile?.meta?.compartment?.find(
        c => c.reference?.startsWith('Organization/')
      )?.reference;

      if (!orgReference) {
        // If no compartment, check membership
        const membership = await medplum.getProfile();
        const membershipOrgRef = membership?.extension?.find(
          (e: { url: string }) => e.url === 'http://example.com/fhir/StructureDefinition/current-organization'
        )?.valueReference?.reference;

        if (!membershipOrgRef) {
          throw new Error('No organization found. Please set up your organization first.');
        }

        const org = await medplum.readReference<Organization>({ reference: membershipOrgRef });
        console.log('Organization loaded from membership:', org);
        setOrganization(org);
      } else {
        // Load from compartment reference
        const org = await medplum.readReference<Organization>({ reference: orgReference });
        console.log('Organization loaded from compartment:', org);
        setOrganization(org);
      }
    } catch (err) {
      console.error('Organization fetch error:', err);
      setError('Failed to fetch organization details');
    } finally {
      setLoading(false);
    }
  };

  // Refresh organization data when payment status changes
  useEffect(() => {
    if (profile && (paymentStatus === 'success' || !organization)) {
      fetchOrganization();
    }
  }, [profile, paymentStatus]);

  const createSubscription = async () => {
    try {
      console.log('🚀 Starting subscription creation...');
      setLoading(true);
      setError(undefined);

      if (!organization?.id) {
        console.error('❌ No organization ID found');
        throw new Error('Organization ID not found');
      }
      console.log('👥 Organization ID:', organization.id);

      console.log('🤖 Executing bot to create payment intent...');
      const response = await medplum.executeBot(
        '01956d13-409d-76c9-8656-597e92d6dd9f',
        {
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'organizationId',
              valueString: organization.id
            }
          ]
        }
      );
      console.log('🤖 Full Bot response:', JSON.stringify(response, null, 2));

      if (response.resourceType === 'OperationOutcome') {
        console.error('❌ Bot returned error:', response);
        throw new Error(response.issue?.[0]?.details?.text || 'Failed to create subscription');
      }

      if (!response.parameter?.[0]?.valueString) {
        console.error('❌ Missing client secret in response');
        throw new Error('Invalid response from server');
      }

      const secret = response.parameter[0].valueString;
      console.log('🔑 Client secret details:', {
        length: secret.length,
        prefix: secret.substring(0, 5),
        isValidFormat: secret.startsWith('pi_')
      });

      console.log('✅ Setting client secret and initializing Stripe...');
      setClientSecret(secret);
    } catch (err) {
      console.error('❌ Subscription creation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  const subscriptionInfo = organization ? getSubscriptionInfo(organization) : undefined;

  const isSubscribeDisabled = !organization || loading;

  // Initialize Stripe
  useEffect(() => {
    if (clientSecret) {
      setStripeReady(true);
    }
  }, [clientSecret]);

  const options: StripeElementsOptions = useMemo(() => ({
    clientSecret,
    appearance: {
      theme: 'stripe'
    },
    loader: 'always'
  }), [clientSecret]);

  // Add logging for Elements mounting
  useEffect(() => {
    console.log('🎨 Elements options:', {
      hasClientSecret: !!clientSecret,
      stripeReady,
      elementsReady
    });
  }, [clientSecret, stripeReady, elementsReady]);

  const handleSaveOrganization = async (updatedOrg: Organization) => {
    try {
      const result = await medplum.updateResource(updatedOrg);
      setOrganization(result);
    } catch (err) {
      setError('Failed to update organization');
    }
  };

  const SUBSCRIPTION_PLANS = [
    {
      name: 'Basic',
      price: 6.90,
      interval: 'month',
      features: [
        { text: 'Up to 5 users', included: true },
        { text: 'Basic analytics', included: true },
        { text: 'Standard support', included: true },
        { text: 'Advanced features', included: false },
      ],
      isActive: true
    },
    {
      name: 'Premium',
      price: 99,
      interval: 'month',
      features: [
        { text: 'Unlimited users', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'Priority support', included: true },
        { text: 'Advanced features', included: true },
      ],
      isActive: false
    }
  ];

  const handleCancelSubscription = async () => {
    try {
      setLoading(true);
      setError(undefined);

      if (!organization?.id) {
        throw new Error('Organization ID not found');
      }

      // Execute bot to cancel subscription
      const response = await medplum.executeBot(
        '01956d13-409d-76c9-8656-597e92d6dd9f', // Use the same bot ID as subscription creation
        {
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'organizationId',
              valueString: organization.id
            },
            {
              name: 'action',
              valueString: 'cancel'
            }
          ]
        }
      );

      if (response.resourceType === 'OperationOutcome') {
        throw new Error(response.issue?.[0]?.details?.text || 'Failed to cancel subscription');
      }

      // Update organization data to reflect cancellation
      await fetchOrganization();

      // Show success message
      showNotification({
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled successfully.',
        color: 'blue'
      });

    } catch (err) {
      console.error('Subscription cancellation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper p="xl">
      <Stack gap="xl">
        <Title order={2}>Subscription Settings</Title>
        
        <PaymentStatusAlert 
          status={paymentStatus}
          error={error}
        />

        {subscriptionInfo ? (
          <CurrentSubscription 
            subscriptionInfo={subscriptionInfo}
            onCancel={handleCancelSubscription}
          />
        ) : (
          <>
            <Grid>
              {SUBSCRIPTION_PLANS.map((plan) => (
                <Grid.Col span={6} key={plan.name}>
                  <PlanCard
                    {...plan}
                    loading={loading}
                    onSelect={() => {
                      if (plan.isActive) {
                        setSelectedPlan(plan);
                        createSubscription();
                      }
                    }}
                    disabled={!plan.isActive}
                  />
                </Grid.Col>
              ))}
            </Grid>

            {clientSecret && selectedPlan && (
              <Card withBorder>
                <Stack>
                  <Text size="lg" fw={700}>Complete Your Subscription</Text>
                  <Text>You selected the {selectedPlan.name} plan at ${selectedPlan.price}/{selectedPlan.interval}</Text>
                  <Elements stripe={stripePromise} options={options}>
                    <CheckoutForm 
                      clientSecret={clientSecret}
                      onReady={() => setElementsReady(true)}
                    />
                  </Elements>
                </Stack>
              </Card>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
}
