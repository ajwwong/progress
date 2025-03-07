import { Button, Group, Paper, Stack, Text, List, ThemeIcon, Alert, Card, Badge, Title, TextInput, Select } from '@mantine/core';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Organization } from '@medplum/fhirtypes';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { IconCheck, IconEdit, IconX } from '@tabler/icons-react';
import { STRIPE_CONFIG } from '../../../config/stripe-config';
import { useLocation, useNavigate } from 'react-router-dom';

// Initialize Stripe outside of component
const stripePromise = loadStripe('pk_test_jIqc6QAfldl6cJQ2zemJUGlv');

// Use the same subscription info interface but add price details
interface SubscriptionInfo {
  status: string;
  planId: string;
  periodEnd: string;
  price?: number;
  interval?: string;
}

function getSubscriptionInfo(organization: Organization): SubscriptionInfo | undefined {
  if (!organization.extension) return undefined;

  const status = organization.extension.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-status'
  )?.valueString;

  const planId = organization.extension.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-plan'
  )?.valueString;

  const periodEnd = organization.extension.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-period-end'
  )?.valueDateTime;

  if (!status || !planId || !periodEnd) return undefined;

  // Get price info from config
  const planConfig = STRIPE_CONFIG.TEST.PREMIUM;
  
  return {
    status,
    planId,
    periodEnd,
    price: planConfig.amount / 100, // Convert cents to dollars
    interval: planConfig.interval
  };
}

// Helper function to validate client secret format
function isValidClientSecret(secret: string): boolean {
  // Stripe client secret format: pi_XXX_secret_XXX or seti_XXX_secret_XXX
  const validPattern = /^(pi|seti)_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/;
  return validPattern.test(secret);
}

// Payment form component
function CheckoutForm({ clientSecret, onReady }: { clientSecret: string; onReady: () => void }): JSX.Element {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Monitor all dependencies for payment form
  useEffect(() => {
    const ready = !!(stripe && elements && paymentElementReady);
    console.log('🔄 Payment form readiness check:', {
      stripeLoaded: !!stripe,
      elementsLoaded: !!elements,
      paymentElementReady,
      allReady: ready
    });

    if (ready) {
      console.log('✅ All payment components ready');
      setShowForm(true);
      onReady();
    }
  }, [stripe, elements, paymentElementReady, onReady]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log('🚀 Payment submission started');

    if (!stripe || !elements || !paymentElementReady) {
      console.error('❌ Payment system not fully initialized:', {
        stripeLoaded: !!stripe,
        elementsLoaded: !!elements,
        paymentElementReady
      });
      setError('Payment system is not fully initialized');
      return;
    }

    try {
      setProcessing(true);
      setError(undefined);

      console.log('🔄 Validating payment form...');
      const { error: validationError } = await elements.submit();
      if (validationError) {
        console.error('❌ Validation error:', validationError);
        throw validationError;
      }

      console.log('💳 Confirming payment...');
      const { error: paymentError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/settings?tab=subscription&redirect_status=succeeded`,
        },
      });

      if (paymentError) {
        console.error('❌ Payment error:', paymentError);
        throw paymentError;
      }
    } catch (err) {
      console.error('❌ Payment submission failed:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ opacity: showForm ? 1 : 0 }}>
      <Stack>
        <PaymentElement
          id="payment-element"
          options={{
            layout: 'tabs'
          }}
          onReady={() => {
            console.log('💳 PaymentElement ready');
            setPaymentElementReady(true);
          }}
          onChange={() => {
            // Clear any previous errors when the form changes
            setError(undefined);
          }}
        />
        <Button 
          type="submit" 
          loading={processing}
          disabled={!showForm}
        >
          {processing ? 'Processing...' : 'Complete Payment'}
        </Button>
        {error && (
          <Alert color="red" title="Payment Error">
            {error}
          </Alert>
        )}
      </Stack>
    </form>
  );
}

interface ExtensionEditorProps {
  organization: Organization;
  onSave: (updatedOrg: Organization) => Promise<void>;
}

function ExtensionEditor({ organization, onSave }: ExtensionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  // List of all subscription extensions
  const SUBSCRIPTION_EXTENSIONS = [
    {
      name: 'Status',
      url: 'http://example.com/fhir/StructureDefinition/subscription-status',
      options: ['active', 'pending', 'cancelled', 'trialing']
    },
    {
      name: 'Plan',
      url: 'http://example.com/fhir/StructureDefinition/subscription-plan',
    },
    {
      name: 'Subscription ID',
      url: 'http://example.com/fhir/StructureDefinition/subscription-id',
    },
    {
      name: 'Period End',
      url: 'http://example.com/fhir/StructureDefinition/subscription-period-end',
      type: 'datetime'
    }
  ];

  useEffect(() => {
    // Initialize edit values from organization extensions
    const values: Record<string, string> = {};
    SUBSCRIPTION_EXTENSIONS.forEach(ext => {
      const extension = organization.extension?.find(e => e.url === ext.url);
      values[ext.url] = extension?.valueString || extension?.valueDateTime || '';
    });
    setEditValues(values);
  }, [organization, isEditing]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(undefined);

      // Filter out non-subscription extensions
      const otherExtensions = (organization.extension || []).filter(
        e => !e.url.startsWith('http://example.com/fhir/StructureDefinition/subscription-')
      );

      // Create new subscription extensions
      const subscriptionExtensions = SUBSCRIPTION_EXTENSIONS.map(ext => ({
        url: ext.url,
        [ext.type === 'datetime' ? 'valueDateTime' : 'valueString']: editValues[ext.url]
      })).filter(ext => ext.valueString || ext.valueDateTime);

      // Update organization
      const updatedOrg = {
        ...organization,
        extension: [...otherExtensions, ...subscriptionExtensions]
      };

      await onSave(updatedOrg);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <Card withBorder>
        <Stack>
          <Group justify="space-between">
            <Text fw={500} size="lg">Subscription Details</Text>
            <Button 
              variant="subtle" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Group gap={4}>
                <IconEdit size="1rem" />
                <span>Edit</span>
              </Group>
            </Button>
          </Group>
          {SUBSCRIPTION_EXTENSIONS.map((ext) => {
            const value = organization.extension?.find(e => e.url === ext.url)?.valueString ||
                         organization.extension?.find(e => e.url === ext.url)?.valueDateTime;
            
            if (!value) return null;

            return (
              <Group key={ext.url}>
                <Text fw={500}>{ext.name}:</Text>
                {ext.name === 'Status' ? (
                  <Badge 
                    color={value === 'active' ? 'green' : 
                           value === 'pending' ? 'yellow' : 'red'}
                  >
                    {value}
                  </Badge>
                ) : (
                  <Text>{ext.type === 'datetime' ? new Date(value).toLocaleString() : value}</Text>
                )}
              </Group>
            );
          })}
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder>
      <Stack>
        <Group justify="space-between">
          <Text fw={500} size="lg">Edit Subscription Details</Text>
          <Group gap={8}>
            <Button 
              variant="subtle" 
              color="red"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              <Group gap={4}>
                <IconX size="1rem" />
                <span>Cancel</span>
              </Group>
            </Button>
            <Button 
              variant="light"
              size="sm"
              onClick={handleSave}
              loading={saving}
            >
              <Group gap={4}>
                <IconCheck size="1rem" />
                <span>Save</span>
              </Group>
            </Button>
          </Group>
        </Group>

        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {SUBSCRIPTION_EXTENSIONS.map((ext) => (
          <div key={ext.url}>
            <Text size="sm" fw={500} mb={4}>{ext.name}</Text>
            {ext.options ? (
              <Select
                value={editValues[ext.url]}
                onChange={(value: string | null) => setEditValues(prev => ({ ...prev, [ext.url]: value || '' }))}
                data={ext.options.map(opt => ({ value: opt, label: opt }))}
                clearable
              />
            ) : ext.type === 'datetime' ? (
              <TextInput
                type="datetime-local"
                value={editValues[ext.url]?.slice(0, 16) || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setEditValues(prev => ({ ...prev, [ext.url]: new Date(e.target.value).toISOString() }))
                }
              />
            ) : (
              <TextInput
                value={editValues[ext.url]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setEditValues(prev => ({ ...prev, [ext.url]: e.target.value }))
                }
              />
            )}
          </div>
        ))}
      </Stack>
    </Card>
  );
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

  return (
    <Paper p="md">
      <Stack>
        <Title order={2}>Subscription Settings</Title>
        
        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {paymentStatus === 'success' && (
          <Alert icon={<IconCheck size="1rem" />} color="green" title="Payment Successful">
            Your subscription has been activated successfully! Your organization details will update shortly.
          </Alert>
        )}

        {paymentStatus === 'failed' && (
          <Alert color="red" title="Payment Failed">
            There was an issue processing your payment. Please try again.
          </Alert>
        )}

        {organization && (
          <Stack>
            <Card withBorder>
              <Stack>
                <Text fw={500} size="lg">Organization Details</Text>
                <Text>ID: {organization.id}</Text>
                <Text>Name: {organization.name}</Text>
              </Stack>
            </Card>

            <ExtensionEditor 
              organization={organization}
              onSave={handleSaveOrganization}
            />
          </Stack>
        )}

        {subscriptionInfo ? (
          <Card>
            <Stack>
              <Text fw={500} size="lg">Current Subscription</Text>
              <Group>
                <Text>Status:</Text>
                <Badge 
                  color={subscriptionInfo.status === 'active' ? 'green' : 'red'}
                >
                  {subscriptionInfo.status}
                </Badge>
              </Group>
              {subscriptionInfo.planId && (
                <Text>Plan: {subscriptionInfo.planId}</Text>
              )}
              {subscriptionInfo.periodEnd && (
                <Text>
                  Renews: {new Date(subscriptionInfo.periodEnd).toLocaleDateString()}
                </Text>
              )}
            </Stack>
          </Card>
        ) : (
          <Card>
            <Stack align="center">
              <Text>No active subscription</Text>
              {!clientSecret ? (
                <Button 
                  onClick={createSubscription} 
                  loading={loading} 
                  disabled={isSubscribeDisabled}
                >
                  {loading ? 'Processing...' : 'Subscribe Now'}
                </Button>
              ) : (
                <Elements stripe={stripePromise} options={options}>
                  <CheckoutForm 
                    clientSecret={clientSecret}
                    onReady={() => setElementsReady(true)} 
                  />
                </Elements>
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </Paper>
  );
}
