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
    }
  }
};

export async function handler(medplum: MedplumClient, event: BotEvent<SubscriptionInput>): Promise<any> {
  // Detailed secrets validation
  console.log('Bot secrets validation:', {
    hasSecrets: !!event.secrets,
    secretsKeys: event.secrets ? Object.keys(event.secrets) : [],
    secretKeyType: typeof event.secrets?.['STRIPE_SECRET_KEY'],
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

  // Validate STRIPE_PRICE_ID
  const priceId = STRIPE_CONFIG.TEST.PREMIUM.priceId;
  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID is missing');
  }
  if (!priceId.startsWith('price_')) {
    throw new Error('STRIPE_PRICE_ID has invalid format');
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

  try {
    switch (action) {
      case 'create':
        return handleCreate(medplum, stripe, organizationId);
      case 'cancel':
        return handleCancel(medplum, stripe, organizationId);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Subscription action failed:', error);
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

async function handleCreate(medplum: MedplumClient, stripe: Stripe, organizationId: string) {
  // First, check if organization already has an active subscription
  const organization = await medplum.readResource('Organization', organizationId);
  const subscriptionStatus = organization.extension?.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-status'
  )?.valueString;

  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    throw new Error('Organization already has an active subscription');
  }

  // Create or get customer
  const customers = await stripe.customers.search({
    query: `metadata['organizationId']:'${organizationId}'`,
  });

  let customerId;
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
    
    // Check if customer has any active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active'
    });

    if (subscriptions.data.length > 0) {
      throw new Error('Customer already has an active subscription');
    }
  } else {
    const customer = await stripe.customers.create({
      metadata: { organizationId }
    });
    customerId = customer.id;
  }

  // Create a subscription with an initial payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: STRIPE_CONFIG.TEST.PREMIUM.amount,
    currency: 'usd',
    customer: customerId,
    metadata: {
      organizationId,
      priceId: STRIPE_CONFIG.TEST.PREMIUM.priceId
    },
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never'
    },
    setup_future_usage: 'off_session'
  });

  // Wait for client secret to be available
  if (!paymentIntent.client_secret) {
    const retrievedIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
    if (!retrievedIntent.client_secret) {
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

  // Update organization with subscription info while preserving existing data
  const existingOrg = await medplum.readResource('Organization', organizationId);
  await medplum.updateResource({
    ...existingOrg, // Preserve all existing fields
    extension: [
      ...(existingOrg.extension || []).filter(e => 
        e.url !== 'http://example.com/fhir/StructureDefinition/subscription-status' &&
        e.url !== 'http://example.com/fhir/StructureDefinition/subscription-plan'
      ),
      {
        url: 'http://example.com/fhir/StructureDefinition/subscription-status',
        valueString: paymentIntent.status
      },
      {
        url: 'http://example.com/fhir/StructureDefinition/subscription-plan',
        valueString: STRIPE_CONFIG.TEST.PREMIUM.priceId
      }
    ]
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
  // Get organization
  const organization = await medplum.readResource('Organization', organizationId);
  
  // Find customer
  const customers = await stripe.customers.search({
    query: `metadata['organizationId']:'${organizationId}'`,
  });

  if (customers.data.length === 0) {
    throw new Error('No customer found for this organization');
  }

  const customerId = customers.data[0].id;

  // Get active subscriptions
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active'
  });

  if (subscriptions.data.length === 0) {
    throw new Error('No active subscription found');
  }

  // Cancel the subscription
  const subscription = subscriptions.data[0];
  await stripe.subscriptions.cancel(subscription.id);

  // Update organization extensions
  await medplum.updateResource({
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
      }
    ]
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