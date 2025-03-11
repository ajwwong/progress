import { Button, Group, Paper, Stack, Text, List, ThemeIcon, Alert, Card, Badge, Title, TextInput, Select, Grid, Progress, Divider, Modal, Box, Transition, Tooltip, Tabs } from '@mantine/core';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Organization, Practitioner } from '@medplum/fhirtypes';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { IconCheck, IconEdit, IconX, IconArrowRight, IconCircleCheck, IconInfoCircle, IconTable, IconChartBar, IconReceipt } from '@tabler/icons-react';
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
import { PlanComparisonTable } from './subscription/PlanComparisonTable';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Helper function to validate client secret format
function isValidClientSecret(secret: string): boolean {
  // Stripe client secret format: pi_XXX_secret_XXX or seti_XXX_secret_XXX
  const validPattern = /^(pi|seti)_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/;
  return validPattern.test(secret);
}

// Add type definition for the plan structure
type StripePlan = {
  priceId: string;
  amount: number;
  sessions: number;
  interval: string;
};

// Add type definition for the config structure
type StripeMode = 'TEST' | 'PROD';

// Define subscription tiers with proper typing
const SUBSCRIPTION_TIERS = [
  {
    name: 'Standard',
    description: 'No contracts, pay as you go',
    options: Object.entries(STRIPE_CONFIG[import.meta.env.VITE_STRIPE_MODE as StripeMode].STANDARD.plans)
      .map(([_, plan]) => ({
        value: String((plan as StripePlan).sessions),
        label: `${(plan as StripePlan).sessions} sessions/mo`,
        priceId: (plan as StripePlan).priceId
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
  periodEnd?: string;
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
  const profile = useMedplumProfile() as Practitioner;
  const [stripeReady, setStripeReady] = useState(false);
  const [elementsReady, setElementsReady] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);
  const [upgradeSummary, setUpgradeSummary] = useState<{
    fromPlan: string;
    toPlan: string;
    fromSessions: number;
    toSessions: number;
  } | null>(null);

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
    
    // Get billing cycle end date
    const periodEnd = org.extension?.find(
      e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-period-end'
    )?.valueDateTime;

    return {
      status,
      sessionsUsed,
      sessionsLimit,
      plan,
      periodEnd
    };
  };

  // Get available plans for upgrade (only plans with more sessions than current)
  const getAvailablePlans = (currentPlan: PlanDetails) => {
    // If not on an active plan, show all plans
    if (currentPlan.status !== 'active') {
      return SUBSCRIPTION_TIERS[0].options;
    }

    // Find current plan in options
    const currentPlanOption = SUBSCRIPTION_TIERS[0].options.find(
      option => option.priceId === currentPlan.plan
    );

    // If current plan not found, show all plans
    if (!currentPlanOption) {
      return SUBSCRIPTION_TIERS[0].options;
    }

    // Only show plans with more sessions than current plan
    return SUBSCRIPTION_TIERS[0].options.filter(
      option => Number(option.value) > Number(currentPlanOption.value)
    );
  };

  // Set initial selected sessions based on current plan
  useEffect(() => {
    if (organization) {
      const currentPlan = getCurrentPlanDetails(organization);
      const availablePlans = getAvailablePlans(currentPlan);
      
      if (availablePlans.length > 0) {
        // Default to the first available upgrade option
        setSelectedSessions(availablePlans[0].value);
      }
    }
  }, [organization]);

  // Get price based on selected sessions
  const getPrice = (sessions: string) => {
    const plan = Object.values(STRIPE_CONFIG[import.meta.env.VITE_STRIPE_MODE as StripeMode].STANDARD.plans).find(
      p => p.sessions === Number(sessions)
    );
    return plan ? plan.amount / 100 : 29;
  };

  // Get price ID based on selected sessions
  const getPriceId = (sessions: string) => {
    const firstPlan = Object.values(STRIPE_CONFIG[import.meta.env.VITE_STRIPE_MODE as StripeMode].STANDARD.plans)[0];
    const plan = Object.values(STRIPE_CONFIG[import.meta.env.VITE_STRIPE_MODE as StripeMode].STANDARD.plans).find(
      p => p.sessions === Number(sessions)
    );
    return plan ? plan.priceId : firstPlan.priceId;
  };

  // Handle successful payment or upgrade
  const handlePaymentSuccess = useCallback(() => {
    setPaymentStatus('success');
    setClientSecret('');
    setStripeReady(false);
    setShowUpgradeSuccess(true);
    fetchOrganization();
  }, []);

  // Get plan name from sessions count
  const getPlanName = (sessions: number | string): string => {
    const sessionsNum = typeof sessions === 'string' ? parseInt(sessions, 10) : sessions;
    return `${sessionsNum} Sessions Plan`;
  };

  // Get user's name and email from profile
  const getUserInfo = () => {
    if (!profile) {
      return { name: undefined, email: undefined };
    }

    // Get name from profile
    const name = profile.name?.[0]?.text || 
                [profile.name?.[0]?.given?.join(' '), profile.name?.[0]?.family]
                  .filter(Boolean)
                  .join(' ') || 
                undefined;

    // Get email from profile
    const email = profile.telecom?.find(t => t.system === 'email')?.value || undefined;

    return { name, email };
  };

  const createSubscription = async () => {
    try {
      setLoading(true);
      setError(undefined);
      setShowUpgradeSuccess(false);

      if (!organization?.id) {
        throw new Error('Organization ID not found');
      }

      const currentPlan = getCurrentPlanDetails(organization);
      const isUpgrade = currentPlan.status === 'active';
      setIsUpgrading(isUpgrade);

      // Store upgrade summary for success message
      if (isUpgrade) {
        setUpgradeSummary({
          fromPlan: currentPlan.plan,
          toPlan: getPriceId(selectedSessions),
          fromSessions: currentPlan.sessionsLimit,
          toSessions: parseInt(selectedSessions, 10)
        });
      }

      // Get user info for Stripe
      const { name: customerName, email: customerEmail } = getUserInfo();

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
            },
            {
              name: 'action',
              valueString: isUpgrade ? 'upgrade' : 'create'
            },
            ...(customerName ? [{
              name: 'customerName',
              valueString: customerName
            }] : []),
            ...(customerEmail ? [{
              name: 'customerEmail',
              valueString: customerEmail
            }] : [])
          ]
        }
      );

      if (response.resourceType === 'OperationOutcome') {
        throw new Error(response.issue?.[0]?.details?.text || `Failed to ${isUpgrade ? 'upgrade' : 'create'} subscription`);
      }

      // Check if we got a client secret (needed for payment)
      const clientSecretParam = response.parameter?.find((p: { name: string; valueString?: string }) => p.name === 'clientSecret');
      const statusParam = response.parameter?.find((p: { name: string; valueString?: string }) => p.name === 'status');
      const status = statusParam?.valueString;

      // If we have a client secret, we need to collect payment
      if (clientSecretParam?.valueString) {
        setClientSecret(clientSecretParam.valueString);
        setStripeReady(true);
      } 
      // If status is 'upgraded', the upgrade was successful without requiring payment
      else if (status === 'upgraded') {
        setPaymentStatus('success');
        setShowUpgradeSuccess(true);
        await fetchOrganization();
        showNotification({
          title: 'Subscription Upgraded',
          message: 'Your subscription has been upgraded successfully.',
          color: 'green'
        });
      } 
      // Handle other cases
      else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err instanceof Error ? err.message : `Failed to ${isUpgrading ? 'upgrade' : 'create'} subscription`);
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

      // Get user info for Stripe
      const { name: customerName, email: customerEmail } = getUserInfo();

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
            },
            ...(customerName ? [{
              name: 'customerName',
              valueString: customerName
            }] : []),
            ...(customerEmail ? [{
              name: 'customerEmail',
              valueString: customerEmail
            }] : [])
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

        {paymentStatus && !showUpgradeSuccess && (
          <PaymentStatusAlert status={paymentStatus} />
        )}

        {organization && (
          <Stack gap="xl">
            {/* Upgrade Success Message */}
            <Transition mounted={showUpgradeSuccess} transition="slide-down" duration={400} timingFunction="ease">
              {(styles) => (
                <Alert 
                  color="green" 
                  title="Subscription Upgraded Successfully" 
                  icon={<IconCircleCheck size={24} />}
                  style={{ ...styles }}
                  withCloseButton
                  onClose={() => setShowUpgradeSuccess(false)}
                >
                  <Stack gap="md">
                    {upgradeSummary && (
                      <Box>
                        <Text>Your subscription has been upgraded from:</Text>
                        <Group mt="xs" align="center">
                          <Badge size="lg" color="blue">
                            {getPlanName(upgradeSummary.fromSessions)}
                          </Badge>
                          <IconArrowRight size={16} />
                          <Badge size="lg" color="green">
                            {getPlanName(upgradeSummary.toSessions)}
                          </Badge>
                        </Group>
                        <Text mt="md" size="sm">
                          Your new session limit of {upgradeSummary.toSessions} is now active. You'll be charged the prorated difference for the remainder of your billing cycle.
                        </Text>
                        {organization && (() => {
                          const currentPlan = getCurrentPlanDetails(organization);
                          if (currentPlan.periodEnd) {
                            return (
                              <Text size="sm" mt={5}>
                                Your current billing cycle ends on <Text component="span" fw={500}>{new Date(currentPlan.periodEnd).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}</Text>.
                                <Tooltip
                                  label="Your subscription will automatically renew on this date unless canceled"
                                  position="top"
                                  withArrow
                                  multiline
                                  w={220}
                                >
                                  <IconInfoCircle size={14} style={{ marginLeft: 5, verticalAlign: 'middle' }} />
                                </Tooltip>
                              </Text>
                            );
                          }
                          return null;
                        })()}
                      </Box>
                    )}
                    <Button 
                      variant="light" 
                      color="green" 
                      onClick={() => setShowUpgradeSuccess(false)}
                      size="sm"
                    >
                      Got it
                    </Button>
                  </Stack>
                </Alert>
              )}
            </Transition>

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
                      {currentPlan.status === 'active' && currentPlan.periodEnd && (
                        <Text c="dimmed" size="sm" mt={5}>
                          Billing cycle ends: {new Date(currentPlan.periodEnd).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          <Tooltip
                            label="Your subscription will automatically renew on this date unless canceled"
                            position="top"
                            withArrow
                            multiline
                            w={220}
                          >
                            <IconInfoCircle size={14} style={{ marginLeft: 5, verticalAlign: 'middle' }} />
                          </Tooltip>
                        </Text>
                      )}
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

            {/* Available Plans Section */}
            {(() => {
              const currentPlan = getCurrentPlanDetails(organization);
              const availablePlans = getAvailablePlans(currentPlan);
              const isActive = currentPlan.status === 'active';
              
              return (
                <Stack gap="md">
                  <Title order={3}>
                    {isActive ? 'Upgrade Your Plan' : 'Standard'}
                  </Title>
                  <Text c="dimmed" size="sm">
                    {isActive 
                      ? 'Upgrade to get more sessions per month' 
                      : 'No contracts, pay as you go'}
                  </Text>
                  
                  {availablePlans.length === 0 ? (
                    <Alert color="blue" title="You're on our highest plan">
                      You're already on our highest plan with {currentPlan.sessionsLimit} sessions per month.
                    </Alert>
                  ) : (
                    <Tabs defaultValue="selector">
                      <Tabs.List mb="md">
                        <Tabs.Tab value="selector" leftSection={<IconChartBar size={16} />}>
                          Plan Selector
                        </Tabs.Tab>
                      </Tabs.List>

                      <Tabs.Panel value="selector">
                        <Stack>
                          <Group align="flex-end" gap="xs">
                            <Text size="xl" fw={700}>${getPrice(selectedSessions)}</Text>
                            <Text size="sm" c="dimmed" mb={4}>/month</Text>
                          </Group>

                          <Select
                            data={availablePlans}
                            value={selectedSessions}
                            onChange={(value) => setSelectedSessions(value || availablePlans[0].value)}
                            size="md"
                            radius="md"
                            label={isActive ? "Select new plan" : "Select plan"}
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
                            disabled={!organization || loading || clientSecret !== ''}
                            mt="md"
                          >
                            {isActive ? 'Upgrade Plan' : 'Subscribe Now'}
                          </Button>
                        </Stack>
                      </Tabs.Panel>
                    </Tabs>
                  )}
                </Stack>
              );
            })()}

            {/* Payment Section */}
            {clientSecret && stripeReady && (
              <Transition mounted={true} transition="fade" duration={400}>
                {(styles) => (
                  <Stack gap="md" style={styles}>
                    <Text fw={500} size="lg">Payment Details</Text>
                    <Alert color="blue" title={isUpgrading ? "Upgrade Payment" : "Subscription Payment"}>
                      {isUpgrading 
                        ? "You'll be charged the prorated difference between your current plan and the new plan."
                        : "You'll be charged immediately for your first month of service."}
                    </Alert>
                    <Elements stripe={stripePromise} options={options}>
                      <CheckoutForm 
                        clientSecret={clientSecret}
                        onReady={() => setElementsReady(true)}
                        onPaymentSuccess={handlePaymentSuccess}
                      />
                    </Elements>
                  </Stack>
                )}
              </Transition>
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
            You will be moved to the free tier with a limit of 10 sessions per month. 
            {organization && (() => {
              const currentPlan = getCurrentPlanDetails(organization);
              if (currentPlan.periodEnd) {
                return (
                  <Text size="sm" fw={500} mt={5}>
                    Your sessions will reset on {new Date(currentPlan.periodEnd).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}.
                  </Text>
                );
              }
              return null;
            })()}
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
