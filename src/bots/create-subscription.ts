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
    STANDARD: {
      productId: 'prod_RuJ136Rn5045S8',
      plans: {
        SESSIONS_30: {
          priceId: 'price_1R0UlJIfLgrjtRiqrBl5AVE8',
          amount: 2900,
          sessions: 30,
          interval: 'month'
        },
        SESSIONS_45: {
          priceId: 'price_1R0UlJIfLgrjtRiqKDpSb8Mz',
          amount: 4500,
          sessions: 45,
          interval: 'month'
        },
        SESSIONS_60: {
          priceId: 'price_1R0UlJIfLgrjtRiqTfKFUGuG',
          amount: 5900,
          sessions: 60,
          interval: 'month'
        },
        SESSIONS_80: {
          priceId: 'price_1R0UlJIfLgrjtRiqED7TsKjN',
          amount: 7900,
          sessions: 80,
          interval: 'month'
        },
        SESSIONS_100: {
          priceId: 'price_1R0UlJIfLgrjtRiqWGMnViYR',
          amount: 9900,
          sessions: 100,
          interval: 'month'
        },
        SESSIONS_120: {
          priceId: 'price_1R0UlJIfLgrjtRiqTf1tMIzR',
          amount: 11900,
          sessions: 120,
          interval: 'month'
        },
        SESSIONS_150: {
          priceId: 'price_1R0UlJIfLgrjtRiqqNCMiYbb',
          amount: 14900,
          sessions: 150,
          interval: 'month'
        },
        SESSIONS_200: {
          priceId: 'price_1R0UlJIfLgrjtRiq0Z4XpUpJ',
          amount: 19800,
          sessions: 200,
          interval: 'month'
        },
        SESSIONS_300: {
          priceId: 'price_1R0UlJIfLgrjtRiqHIbpQrL7',
          amount: 29700,
          sessions: 300,
          interval: 'month'
        },
        SESSIONS_400: {
          priceId: 'price_1R0UlJIfLgrjtRiqM8JrLJrw',
          amount: 39600,
          sessions: 400,
          interval: 'month'
        },
        SESSIONS_500: {
          priceId: 'price_1R0UlJIfLgrjtRiqBkoTkbum',
          amount: 49600,
          sessions: 500,
          interval: 'month'
        }
      }
    }
  },
  PROD: {
    STANDARD: {
      productId: 'prod_RuglFA4O4PJLnV',
      plans: {
        SESSIONS_1: {
          priceId: 'price_1R116uIfLgrjtRiqwRBCuwLe',
          amount: 100,
          sessions: 1,
          interval: 'month'
        },
        SESSIONS_20: {
          priceId: 'price_1R0rWeIfLgrjtRiqslYBfEcJ',
          amount: 900,
          sessions: 20,
          interval: 'month'
        },
        SESSIONS_40: {
          priceId: 'price_1R0rOJIfLgrjtRiqEkey827c',
          amount: 1900,
          sessions: 40,
          interval: 'month'
        },
        SESSIONS_60: {
          priceId: 'price_1R0rQMIfLgrjtRiquFCsq1Du',
          amount: 2900,
          sessions: 60,
          interval: 'month'
        },
        SESSIONS_80: {
          priceId: 'price_1R0rWeIfLgrjtRiqM8RQXfmt',
          amount: 3900,
          sessions: 80,
          interval: 'month'
        },
        SESSIONS_100: {
          priceId: 'price_1R0rQMIfLgrjtRiqsxZtyiQX',
          amount: 4900,
          sessions: 100,
          interval: 'month'
        },
        SESSIONS_120: {
          priceId: 'price_1R0rOJIfLgrjtRiqNuH3bTD8',
          amount: 5900,
          sessions: 120,
          interval: 'month'
        },
        SESSIONS_140: {
          priceId: 'price_1R0rWeIfLgrjtRiqBR4L8kMI',
          amount: 6900,
          sessions: 140,
          interval: 'month'
        },
        SESSIONS_160: {
          priceId: 'price_1R0rWeIfLgrjtRiqPzF583G6',
          amount: 7900,
          sessions: 160,
          interval: 'month'
        },
        SESSIONS_200: {
          priceId: 'price_1R0rYBIfLgrjtRiq1WmmBbkL',
          amount: 9900,
          sessions: 200,
          interval: 'month'
        },
        SESSIONS_300: {
          priceId: 'price_1R0s0jIfLgrjtRiqPQt4x4je',
          amount: 14900,
          sessions: 300,
          interval: 'month'
        },
        SESSIONS_400: {
          priceId: 'price_1R0s2IIfLgrjtRiq8RLFLpqM',
          amount: 19700,
          sessions: 400,
          interval: 'month'
        }
      }
    }
  }
};

// Update type definitions to match the new config structure
interface Plan {
  priceId: string;
  amount: number;
  sessions: number;
  interval: string;
}

interface PlanConfig {
  productId: string;
  plans: Record<string, Plan>;
}

interface StripeConfig {
  STANDARD: PlanConfig;
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

// Helper function to get plan details - now checks both TEST and PROD modes
async function getPlanDetails(medplum: MedplumClient, priceId: string, secretKey: string): Promise<Plan | undefined> {
  // Determine if we're in TEST or PROD mode based on the secret key
  const mode = secretKey.startsWith('sk_test_') ? 'TEST' : 'PROD';

  await createLog(medplum, 'get-plan', { 
    checking_price: priceId,
    mode,
    available_plans: STRIPE_CONFIG[mode].STANDARD.plans
  });

  // Check in the appropriate mode's plans
  const plan = Object.values(STRIPE_CONFIG[mode].STANDARD.plans).find(p => p.priceId === priceId);
  if (plan) {
    await createLog(medplum, 'plan-found', { plan });
    return plan;
  }
  
  await createLog(medplum, 'plan-not-found', { priceId, mode });
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

    // Validate input parameters
    if (!event.input?.parameter) {
      throw new Error('Missing input parameters');
    }

    const organizationId = event.input.parameter?.find(p => p.name === 'organizationId')?.valueString;
    const action = event.input.parameter?.find(p => p.name === 'action')?.valueString || 'create';

    if (!organizationId) {
      throw new Error('Missing organizationId parameter');
    }

    // Get customer information if provided
    const customerName = event.input.parameter?.find(p => p.name === 'customerName')?.valueString;
    const customerEmail = event.input.parameter?.find(p => p.name === 'customerEmail')?.valueString;

    // Initialize Stripe with validated key
    const stripe = new Stripe(secretKeyValue, {
      apiVersion: '2023-10-16'
    });

    // Handle new actions

    if (action === 'cancel') {
      await createLog(medplum, 'processing', {
        action,
        organizationId
      });
      return handleCancel(medplum, stripe, organizationId, customerName, customerEmail);
    }

    // For upgrade action, we need a price ID
    if (action === 'upgrade') {
      const inputPriceId = event.input.parameter?.find(p => p.name === 'priceId')?.valueString;
      await createLog(medplum, 'price-validation-upgrade', { inputPriceId });

      if (!inputPriceId) {
        await createLog(medplum, 'error', 'Missing price ID');
        throw new Error('Missing price ID for subscription upgrade');
      }

      const priceId = inputPriceId;

      // Validate the price ID format and existence
      if (!priceId.startsWith('price_')) {
        await createLog(medplum, 'error', 'Invalid price ID format');
        throw new Error('Invalid price ID format');
      }

      const planDetails = await getPlanDetails(medplum, priceId, secretKeyValue);
      if (!planDetails) {
        await createLog(medplum, 'error', `Invalid price ID: ${priceId} not found in available plans`);
        throw new Error(`Invalid price ID: ${priceId} not found in available plans`);
      }

      await createLog(medplum, 'processing', {
        action,
        organizationId,
        priceId,
        planType: 'session-based'
      });

      return handleUpgrade(medplum, stripe, organizationId, priceId, planDetails, customerName, customerEmail);
    }

    // For create action, we need to validate the price ID
    const inputPriceId = event.input.parameter?.find(p => p.name === 'priceId')?.valueString;
    await createLog(medplum, 'price-validation', { inputPriceId });

    if (!inputPriceId) {
      await createLog(medplum, 'error', 'Missing price ID');
      throw new Error('Missing price ID for subscription creation');
    }

    const priceId = inputPriceId;

    // Validate the price ID format and existence
    if (!priceId.startsWith('price_')) {
      await createLog(medplum, 'error', 'Invalid price ID format');
      throw new Error('Invalid price ID format');
    }

    const planDetails = await getPlanDetails(medplum, priceId, secretKeyValue);
    if (!planDetails) {
      await createLog(medplum, 'error', `Invalid price ID: ${priceId} not found in available plans`);
      throw new Error(`Invalid price ID: ${priceId} not found in available plans`);
    }

    await createLog(medplum, 'processing', {
      action,
      organizationId,
      priceId,
      planType: 'session-based'
    });

    return handleCreate(medplum, stripe, organizationId, priceId, planDetails, customerName, customerEmail);
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

async function handleCreate(
  medplum: MedplumClient, 
  stripe: Stripe, 
  organizationId: string, 
  priceId: string, 
  planDetails: Plan, 
  customerName?: string, 
  customerEmail?: string
) {
  await createLog(medplum, 'create-start', { organizationId, priceId, planDetails, customerName, customerEmail });

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
    
    // Update customer information if provided
    if (customerName || customerEmail) {
      const updateData: Stripe.CustomerUpdateParams = { metadata: { organizationId } };
      if (customerName) updateData.name = customerName;
      if (customerEmail) updateData.email = customerEmail;
      
      await stripe.customers.update(customerId, updateData);
      await createLog(medplum, 'customer-updated', { customerId, customerName, customerEmail });
    }
    
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
    // Create new customer with all available information
    const customerData: Stripe.CustomerCreateParams = { metadata: { organizationId } };
    if (customerName) customerData.name = customerName;
    if (customerEmail) customerData.email = customerEmail;
    
    const customer = await stripe.customers.create(customerData);
    customerId = customer.id;
    await createLog(medplum, 'customer-created', { customerId, customerName, customerEmail });
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
  const sessionLimit = planDetails.sessions;

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

async function handleCancel(
  medplum: MedplumClient, 
  stripe: Stripe, 
  organizationId: string,
  customerName?: string,
  customerEmail?: string
) {
  await createLog(medplum, 'cancel-start', { organizationId, customerName, customerEmail });

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

  // Update customer information if provided
  if (customerName || customerEmail) {
    const updateData: Stripe.CustomerUpdateParams = {};
    if (customerName) updateData.name = customerName;
    if (customerEmail) updateData.email = customerEmail;
    
    await stripe.customers.update(customerId, updateData);
    await createLog(medplum, 'customer-updated', { customerId, customerName, customerEmail });
  }

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

// Add new function to handle subscription upgrades
async function handleUpgrade(
  medplum: MedplumClient, 
  stripe: Stripe, 
  organizationId: string, 
  priceId: string, 
  planDetails: Plan,
  customerName?: string,
  customerEmail?: string
) {
  await createLog(medplum, 'upgrade-start', { organizationId, priceId, planDetails, customerName, customerEmail });

  // First, check if organization has an active subscription
  const organization = await medplum.readResource('Organization', organizationId);
  const subscriptionStatus = organization.extension?.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-status'
  )?.valueString;

  if (subscriptionStatus !== 'active') {
    await createLog(medplum, 'error', 'No active subscription found for upgrade');
    throw new Error('No active subscription found for upgrade');
  }

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
  
  // Update customer information if provided
  if (customerName || customerEmail) {
    const updateData: Stripe.CustomerUpdateParams = {};
    if (customerName) updateData.name = customerName;
    if (customerEmail) updateData.email = customerEmail;
    
    await stripe.customers.update(customerId, updateData);
    await createLog(medplum, 'customer-updated', { customerId, customerName, customerEmail });
  }

  // Get active subscriptions
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active'
  });

  if (subscriptions.data.length === 0) {
    await createLog(medplum, 'error', 'No active subscription found');
    throw new Error('No active subscription found');
  }

  // Get the active subscription
  const subscription = subscriptions.data[0];
  await createLog(medplum, 'subscription-found', { 
    subscriptionId: subscription.id,
    currentItems: subscription.items.data
  });

  try {
    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'always_invoice', // Immediately invoice for prorations
      payment_behavior: 'allow_incomplete', // Allow the subscription to go to past_due if payment requires action
      metadata: { 
        organizationId,
        upgraded_at: new Date().toISOString(),
        previous_price: subscription.items.data[0].price.id
      }
    });

    await createLog(medplum, 'subscription-upgraded', { 
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      newItems: updatedSubscription.items.data
    });

    // Get current session usage if it exists
    const currentSessionsUsed = organization.extension?.find(
      e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-sessions-used'
    )?.valueInteger || 0;

    // Get session limit based on plan
    const sessionLimit = planDetails.sessions;

    // Update organization with new subscription info
    const updatedOrg = await medplum.updateResource({
      ...organization,
      extension: [
        ...(organization.extension || []).filter(e => 
          e.url !== 'http://example.com/fhir/StructureDefinition/subscription-plan' &&
          e.url !== 'http://example.com/fhir/StructureDefinition/subscription-sessions-allowed'
        ),
        {
          url: 'http://example.com/fhir/StructureDefinition/subscription-plan',
          valueString: priceId
        },
        {
          url: 'http://example.com/fhir/StructureDefinition/subscription-sessions-allowed',
          valueInteger: sessionLimit
        }
      ]
    });

    await createLog(medplum, 'organization-updated', {
      organizationId,
      status: updatedSubscription.status,
      sessionLimit,
      currentSessionsUsed
    });

    // Check if an invoice was created and if it requires payment
    const invoices = await stripe.invoices.list({
      subscription: subscription.id,
      limit: 1
    });

    if (invoices.data.length > 0) {
      const invoice = invoices.data[0];
      await createLog(medplum, 'invoice-status', { 
        invoiceId: invoice.id,
        status: invoice.status,
        paid: invoice.paid,
        paymentIntentId: invoice.payment_intent
      });
      
      // If the invoice is not paid and has a payment intent, return the client secret
      if (!invoice.paid && invoice.payment_intent) {
        const paymentIntentId = typeof invoice.payment_intent === 'string' 
          ? invoice.payment_intent 
          : invoice.payment_intent.id;
        
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.client_secret) {
          await createLog(medplum, 'payment-intent-found', { 
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status
          });
          
          return {
            resourceType: 'Parameters',
            parameter: [
              {
                name: 'clientSecret',
                valueString: paymentIntent.client_secret
              },
              {
                name: 'status',
                valueString: 'requires_payment'
              }
            ]
          };
        }
      }
    }

    // If we got here, the invoice was either automatically paid or doesn't exist
    // Just return success without a client secret
    await createLog(medplum, 'upgrade-success', { 
      message: 'Subscription upgraded successfully without requiring additional payment'
    });
    
    return {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'status',
          valueString: 'upgraded'
        }
      ]
    };
  } catch (error) {
    await createLog(medplum, 'upgrade-error', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}