import { Button, Group, Paper, Stack, Text, List, ThemeIcon, Alert, Card, Badge, Title, TextInput, Select, Grid, Progress, Divider, Modal } from '@mantine/core';
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
import { SessionUsageCard } from './subscription/SessionUsageCard';
import { showNotification } from '@mantine/notifications';
import { SubscriptionStatus } from './subscription/types';

// Initialize Stripe outside of component
const stripePromise = loadStripe('pk_test_jIqc6QAfldl6cJQ2zemJUGlv');

// Helper function to validate client secret format
function isValidClientSecret(secret: string): boolean {
  // Stripe client secret format: pi_XXX_secret_XXX or seti_XXX_secret_XXX
  const validPattern = /^(pi|seti)_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/;
  return validPattern.test(secret);
}

// Define subscription tiers with simpler structure
const SUBSCRIPTION_TIERS = [
  {
    name: 'Standard',
    description: 'No contracts, pay as you go',
    options: Object.entries(STRIPE_CONFIG.TEST.STANDARD.plans).map(([key, plan]) => ({
      value: String(plan.sessions),
      label: `${plan.sessions} sessions/mo`
    })),
    features: [
      'Automated progress notes',
      'Ai-powered magic edits',
      'Calendar scheduler'
    ]
  }
];

interface PlanDetails {
  status: SubscriptionStatus;
  sessionsUsed: number;
  sessionsLimit: number;
  plan: string;
}

// Main subscription component
export function SubscriptionSettings(): JSX.Element {
  const [clientSecret, setClientSecret] = useState('');
  const [organization, setOrganization] = useState<Organization>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | undefined>();
  const [selectedSessions, setSelectedSessions] = useState('30');
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [stripeReady, setStripeReady] = useState(false);
  const [elementsReady, setElementsReady] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);

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

  // Get price based on selected sessions
  const getPrice = (sessions: string) => {
    const plan = Object.values(STRIPE_CONFIG.TEST.STANDARD.plans).find(
      p => p.sessions === Number(sessions)
    );
    return plan ? plan.amount / 100 : 29; // Default to lowest tier if not found
  };

  // Get price ID based on selected sessions
  const getPriceId = (sessions: string) => {
    const plan = Object.values(STRIPE_CONFIG.TEST.STANDARD.plans).find(
      p => p.sessions === Number(sessions)
    );
    return plan ? plan.priceId : STRIPE_CONFIG.TEST.STANDARD.plans.SESSIONS_30.priceId;
  };

  const createSubscription = async () => {
    try {
      setLoading(true);
      setError(undefined);

      if (!organization?.id) {
        throw new Error('Organization ID not found');
      }

      const response = await medplum.executeBot(
        '01956d13-409d-76c9-8656-597e92d6dd9f',
        {
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'organizationId',
              valueString: organization.id
            },
            {
              name: 'priceId',
              valueString: getPriceId(selectedSessions)
            }
          ]
        }
      );

      if (response.resourceType === 'OperationOutcome') {
        throw new Error(response.issue?.[0]?.details?.text || 'Failed to create subscription');
      }

      if (!response.parameter?.[0]?.valueString) {
        throw new Error('Invalid response from server');
      }

      setClientSecret(response.parameter[0].valueString);
      setStripeReady(true);
    } catch (err) {
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

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    try {
      setLoading(true);
      setError(undefined);

      if (!organization?.id) {
        throw new Error('Organization ID not found');
      }

      const response = await medplum.executeBot(
        '01956d13-409d-76c9-8656-597e92d6dd9f',
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

      await fetchOrganization();
      setShowCancelModal(false);

      showNotification({
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled successfully. You will retain access until the end of your billing period.',
        color: 'blue'
      });

    } catch (err) {
      console.error('Subscription cancellation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = organization && !loading;

  // Get current subscription details
  const getCurrentPlanDetails = (org: Organization): PlanDetails => {
    const status = (org.extension?.find(
      e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-status'
    )?.valueString as SubscriptionStatus) || 'free';

    const sessionsUsed = org.extension?.find(
      e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-sessions-used'
    )?.valueInteger || 0;

    const sessionsLimit = org.extension?.find(
      e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-sessions-allowed'
    )?.valueInteger || 10;

    const plan = org.extension?.find(
      e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-plan'
    )?.valueString || 'free';

    return {
      status,
      sessionsUsed,
      sessionsLimit,
      plan
    };
  };

  return (
    <Paper p="xl" radius="md">
      <Stack gap="xl">
        <Title order={2}>Subscription & Usage</Title>
        <Text c="dimmed">Manage your subscription and monitor usage</Text>

        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {paymentStatus && (
          <PaymentStatusAlert status={paymentStatus} />
        )}

        {organization && (
          <Stack gap="xl">
            {/* Current Subscription Section */}
            {(() => {
              const currentPlan = getCurrentPlanDetails(organization);
              return (
                <Stack gap="md">
                  <Group justify="space-between">
                    <div>
                      <Group gap="xs">
                        <Title order={3}>Current Plan</Title>
                        <Badge 
                          color={currentPlan.status === 'active' ? 'green' : 'blue'}
                          size="lg"
                          variant="light"
                        >
                          {currentPlan.status === 'active' ? 'Active' : 'Free Tier'}
                        </Badge>
                      </Group>
                      <Text c="dimmed" size="sm">
                        {currentPlan.status === 'active' 
                          ? `${currentPlan.sessionsLimit} sessions per month` 
                          : 'Limited to 10 sessions per month'}
                      </Text>
                    </div>
                  </Group>

                  <Paper withBorder p="md" radius="md">
                    <Stack gap="md">
                      <Group justify="space-between">
                        <Text>Sessions Used</Text>
                        <Group gap="xs">
                          <Text fw={500}>{currentPlan.sessionsUsed}</Text>
                          <Text c="dimmed">/ {currentPlan.sessionsLimit}</Text>
                        </Group>
                      </Group>
                      <Progress 
                        value={(currentPlan.sessionsUsed / currentPlan.sessionsLimit) * 100}
                        size="xl"
                        radius="xl"
                        color={currentPlan.sessionsUsed >= currentPlan.sessionsLimit ? "red" : "blue"}
                      />
                      {currentPlan.status === 'active' && (
                        <Button 
                          variant="light" 
                          color="red" 
                          onClick={handleCancelClick}
                          loading={loading}
                          fullWidth
                        >
                          Cancel Subscription
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                </Stack>
              );
            })()}

            <Divider my="md" />

            {/* Standard Plan Section */}
            <Stack gap="md">
              <Title order={3}>Standard</Title>
              <Text c="dimmed" size="sm">No contracts, pay as you go</Text>
              
              <Group align="flex-end" gap="xs">
                <Text size="xl" fw={700}>${getPrice(selectedSessions)}</Text>
                <Text size="sm" c="dimmed" mb={4}>/month</Text>
              </Group>

              <Select
                data={SUBSCRIPTION_TIERS[0].options}
                value={selectedSessions}
                onChange={(value) => setSelectedSessions(value || '30')}
                size="md"
                radius="md"
              />

              <Stack gap="xs" mt="md">
                <Text fw={500}>Standard plan includes:</Text>
                <List
                  spacing="xs"
                  size="sm"
                  center
                  icon={
                    <ThemeIcon color="blue" size={20} radius="xl">
                      <IconCheck size={12} />
                    </ThemeIcon>
                  }
                >
                  {SUBSCRIPTION_TIERS[0].features.map((feature, index) => (
                    <List.Item key={index}>{feature}</List.Item>
                  ))}
                </List>
              </Stack>

              <Button
                size="md"
                onClick={createSubscription}
                loading={loading}
                disabled={!organization || loading}
                mt="md"
              >
                {getCurrentPlanDetails(organization).status === 'active' ? 'Change Plan' : 'Subscribe Now'}
              </Button>
            </Stack>

            {/* Payment Section */}
            {clientSecret && stripeReady && (
              <Stack gap="md">
                <Text fw={500} size="lg">Payment Details</Text>
                <Elements stripe={stripePromise} options={options}>
                  <CheckoutForm 
                    clientSecret={clientSecret}
                    onReady={() => setElementsReady(true)}
                  />
                </Elements>
              </Stack>
            )}
          </Stack>
        )}
      </Stack>

      {/* Cancellation Confirmation Modal */}
      <Modal
        opened={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Subscription"
        size="md"
      >
        <Stack gap="md">
          <Text>Are you sure you want to cancel your subscription?</Text>
          <Text size="sm" c="dimmed">
            You will still have access to your current plan until the end of your billing period. 
            After that, you'll be moved to the free tier with a limit of 10 sessions per month.
          </Text>
          
          <Group justify="flex-end" mt="xl">
            <Button 
              variant="light" 
              onClick={() => setShowCancelModal(false)}
              disabled={loading}
            >
              Keep Subscription
            </Button>
            <Button 
              color="red" 
              onClick={handleConfirmCancel}
              loading={loading}
            >
              Yes, Cancel Subscription
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
