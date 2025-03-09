import { BotEvent, MedplumClient } from '@medplum/core';
import Stripe from 'stripe';

interface SubscriptionInput {
  parameter: Array<{
    name: string;
    valueString?: string;
  }>;
}

// Define config directly in bot since it can't access the frontend config
const STRIPE_CONFIG = {
  TEST: {
    PREMIUM: {
      priceId: process.env.STRIPE_PRICE_ID || 'price_1QzVIzIfLgrjtRiqyWxWfbzG',
      amount: 690,
      interval: 'month'
    },
    // Add new plans but keep PREMIUM for backward compatibility
    PLANS: {
      SESSIONS_30: {
        priceId: process.env.STRIPE_PRICE_30_ID || 'price_1R0UlJIfLgrjtRiqrBl5AVE8',
        amount: 2900,
        sessions: 30,
        interval: 'month'
      },
      SESSIONS_45: {
        priceId: process.env.STRIPE_PRICE_45_ID || 'price_1R0UlJIfLgrjtRiqKDpSb8Mz',
        amount: 4500,
        sessions: 45,
        interval: 'month'
      },
      SESSIONS_60: {
        priceId: process.env.STRIPE_PRICE_60_ID || 'price_1R0UlJIfLgrjtRiqTfKFUGuG',
        amount: 5900,
        sessions: 60,
        interval: 'month'
      }
    }
  }
};

// Add type definitions for plans
interface PremiumPlan {
  priceId: string;
  amount: number;
  interval: string;
}

interface SessionPlan extends PremiumPlan {
  sessions: number;
}

type Plan = PremiumPlan | SessionPlan;

// Helper function to check if plan has sessions
function isSessionPlan(plan: Plan): plan is SessionPlan {
  return 'sessions' in plan;
}

// Helper function to create log entries
async function createLog(medplum: MedplumClient, category: string, payload: any) {
  await medplum.createResource({
    resourceType: 'Communication',
    status: 'completed',
    category: [{
      text: `stripe-subscription-${category}`
    }],
    payload: [{
      contentString: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
    }],
    sent: new Date().toISOString()
  });
}

// Helper function to get plan details
async function getPlanDetails(medplum: MedplumClient, priceId: string): Promise<Plan | undefined> {
  await createLog(medplum, 'get-plan', { 
    checking_price: priceId,
    available_plans: STRIPE_CONFIG.TEST.PLANS,
    premium_plan: STRIPE_CONFIG.TEST.PREMIUM 
  });

  // First check in PLANS
  const plan = Object.values(STRIPE_CONFIG.TEST.PLANS).find(p => p.priceId === priceId);
  if (plan) {
    await createLog(medplum, 'plan-found', { plan });
    return plan;
  }
  
  // Fallback to PREMIUM if price matches
  if (priceId === STRIPE_CONFIG.TEST.PREMIUM.priceId) {
    await createLog(medplum, 'premium-plan-found', STRIPE_CONFIG.TEST.PREMIUM);
    return STRIPE_CONFIG.TEST.PREMIUM;
  }
  
  await createLog(medplum, 'plan-not-found', { priceId });
  return undefined;
}

export async function handler(medplum: MedplumClient, event: BotEvent<SubscriptionInput>): Promise<any> {
  try {
    // Log incoming event
    await createLog(medplum, 'request', {
      input: event.input,
      hasSecrets: !!event.secrets,
      secretsKeys: event.secrets ? Object.keys(event.secrets) : []
    });

    if (!event.secrets) {
      throw new Error('No secrets provided to bot');
    }

    // Validate STRIPE_SECRET_KEY
    const secretKeyValue = typeof event.secrets['STRIPE_SECRET_KEY'] === 'string'
      ? event.secrets['STRIPE_SECRET_KEY']
      : event.secrets['STRIPE_SECRET_KEY']?.valueString;

    if (!secretKeyValue) {
      throw new Error('STRIPE_SECRET_KEY is missing');
    }
    if (typeof secretKeyValue !== 'string') {
      throw new Error('STRIPE_SECRET_KEY must be a string');
    }
    if (!secretKeyValue.startsWith('sk_')) {
      throw new Error('STRIPE_SECRET_KEY has invalid format');
    }

    // Get and validate priceId
    const inputPriceId = event.input.parameter?.find(p => p.name === 'priceId')?.valueString;
    await createLog(medplum, 'price-validation', { 
      inputPriceId,
      fallbackPrice: STRIPE_CONFIG.TEST.PREMIUM.priceId 
    });

    const priceId = inputPriceId || STRIPE_CONFIG.TEST.PREMIUM.priceId;

    // Validate the price ID format and existence
    if (!priceId.startsWith('price_')) {
      await createLog(medplum, 'error', 'Invalid price ID format');
      throw new Error('Invalid price ID format');
    }

    const planDetails = await getPlanDetails(medplum, priceId);
    if (!planDetails) {
      await createLog(medplum, 'error', `Invalid price ID: ${priceId} not found in available plans`);
      throw new Error(`Invalid price ID: ${priceId} not found in available plans`);
    }

    // Initialize Stripe with validated key
    const stripe = new Stripe(secretKeyValue, {
      apiVersion: '2023-10-16'
    });

    // Validate input parameters
    if (!event.input?.parameter) {
      throw new Error('Missing input parameters');
    }

    const organizationId = event.input.parameter?.find(p => p.name === 'organizationId')?.valueString;
    const action = event.input.parameter?.find(p => p.name === 'action')?.valueString || 'create';

    if (!organizationId) {
      throw new Error('Missing organizationId parameter');
    }

    await createLog(medplum, 'processing', {
      action,
      organizationId,
      priceId,
      planType: isSessionPlan(planDetails) ? 'session-based' : 'premium'
    });

    switch (action) {
      case 'create':
        return handleCreate(medplum, stripe, organizationId, priceId, planDetails);
      case 'cancel':
        return handleCancel(medplum, stripe, organizationId);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    await createLog(medplum, 'error', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'processing',
        details: { text: error instanceof Error ? error.message : 'Action failed' }
      }]
    };
  }
}

async function handleCreate(medplum: MedplumClient, stripe: Stripe, organizationId: string, priceId: string, planDetails: Plan) {
  await createLog(medplum, 'create-start', { organizationId, priceId, planDetails });

  // First, check if organization already has an active subscription
  const organization = await medplum.readResource('Organization', organizationId);
  const subscriptionStatus = organization.extension?.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-status'
  )?.valueString;

  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    await createLog(medplum, 'error', 'Organization already has an active subscription');
    throw new Error('Organization already has an active subscription');
  }

  // Create or get customer
  const customers = await stripe.customers.search({
    query: `metadata['organizationId']:'${organizationId}'`,
  });

  let customerId;
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
    await createLog(medplum, 'customer-found', { customerId });
    
    // Check if customer has any active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active'
    });

    if (subscriptions.data.length > 0) {
      await createLog(medplum, 'error', 'Customer already has an active subscription');
      throw new Error('Customer already has an active subscription');
    }
  } else {
    const customer = await stripe.customers.create({
      metadata: { organizationId }
    });
    customerId = customer.id;
    await createLog(medplum, 'customer-created', { customerId });
  }

  // Create a subscription with an initial payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: planDetails.amount,
    currency: 'usd',
    customer: customerId,
    metadata: {
      organizationId,
      priceId: priceId
    },
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never'
    },
    setup_future_usage: 'off_session'
  });

  await createLog(medplum, 'payment-intent-created', { 
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status
  });

  // Wait for client secret to be available
  if (!paymentIntent.client_secret) {
    const retrievedIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
    if (!retrievedIntent.client_secret) {
      await createLog(medplum, 'error', 'Failed to get client secret from payment intent');
      throw new Error('Failed to get client secret from payment intent');
    }
    return {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'clientSecret',
          valueString: retrievedIntent.client_secret
        }
      ]
    };
  }

  // Update organization with subscription info and session usage while preserving existing data
  const existingOrg = await medplum.readResource('Organization', organizationId);
  
  // Get current session usage if it exists
  const currentSessionsUsed = existingOrg.extension?.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-sessions-used'
  )?.valueInteger || 0;

  // Get session limit based on plan
  const sessionLimit = isSessionPlan(planDetails) ? planDetails.sessions : 999999; // Use plan sessions or unlimited for PREMIUM

  const updatedOrg = await medplum.updateResource({
    ...existingOrg,
    extension: [
      ...(existingOrg.extension || []).filter(e => 
        e.url !== 'http://example.com/fhir/StructureDefinition/subscription-status' &&
        e.url !== 'http://example.com/fhir/StructureDefinition/subscription-plan' &&
        e.url !== 'http://example.com/fhir/StructureDefinition/subscription-sessions-used' &&
        e.url !== 'http://example.com/fhir/StructureDefinition/subscription-sessions-allowed' &&
        e.url !== 'http://example.com/fhir/StructureDefinition/session-last-reset'
      ),
      {
        url: 'http://example.com/fhir/StructureDefinition/subscription-status',
        valueString: paymentIntent.status
      },
      {
        url: 'http://example.com/fhir/StructureDefinition/subscription-plan',
        valueString: priceId
      },
      {
        url: 'http://example.com/fhir/StructureDefinition/subscription-sessions-used',
        valueInteger: currentSessionsUsed
      },
      {
        url: 'http://example.com/fhir/StructureDefinition/subscription-sessions-allowed',
        valueInteger: sessionLimit
      },
      {
        url: 'http://example.com/fhir/StructureDefinition/session-last-reset',
        valueDateTime: new Date().toISOString()
      }
    ]
  });

  await createLog(medplum, 'organization-updated', {
    organizationId,
    status: paymentIntent.status,
    sessionLimit,
    currentSessionsUsed
  });

  return {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'clientSecret',
        valueString: paymentIntent.client_secret
      }
    ]
  };
}

async function handleCancel(medplum: MedplumClient, stripe: Stripe, organizationId: string) {
  await createLog(medplum, 'cancel-start', { organizationId });

  // Get organization
  const organization = await medplum.readResource('Organization', organizationId);
  
  // Find customer
  const customers = await stripe.customers.search({
    query: `metadata['organizationId']:'${organizationId}'`,
  });

  if (customers.data.length === 0) {
    await createLog(medplum, 'error', 'No customer found for this organization');
    throw new Error('No customer found for this organization');
  }

  const customerId = customers.data[0].id;
  await createLog(medplum, 'customer-found', { customerId });

  // Get active subscriptions
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active'
  });

  if (subscriptions.data.length === 0) {
    await createLog(medplum, 'error', 'No active subscription found');
    throw new Error('No active subscription found');
  }

  // Cancel the subscription
  const subscription = subscriptions.data[0];
  await stripe.subscriptions.cancel(subscription.id);
  await createLog(medplum, 'subscription-cancelled', { subscriptionId: subscription.id });

  // Get current session usage
  const currentSessionsUsed = organization.extension?.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-sessions-used'
  )?.valueInteger || 0;

  // Update organization extensions with free tier values
  const updatedOrg = await medplum.updateResource({
    ...organization,
    extension: [
      ...(organization.extension || []).filter(e => 
        !e.url.startsWith('http://example.com/fhir/StructureDefinition/subscription-')
      ),
      {
        url: 'http://example.com/fhir/StructureDefinition/subscription-status',
        valueString: 'canceled'
      },
      {
        url: 'http://example.com/fhir/StructureDefinition/subscription-period-end',
        valueDateTime: new Date().toISOString()
      },
      {
        url: 'http://example.com/fhir/StructureDefinition/subscription-sessions-used',
        valueInteger: currentSessionsUsed
      },
      {
        url: 'http://example.com/fhir/StructureDefinition/subscription-sessions-allowed',
        valueInteger: 10 // Free tier limit
      },
      {
        url: 'http://example.com/fhir/StructureDefinition/session-last-reset',
        valueDateTime: new Date().toISOString()
      }
    ]
  });

  await createLog(medplum, 'organization-updated', {
    organizationId,
    status: 'canceled',
    currentSessionsUsed,
    newSessionLimit: 10
  });

  return {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'status',
        valueString: 'canceled'
      }
    ]
  };
}