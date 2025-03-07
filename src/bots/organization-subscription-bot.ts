import { BotEvent, MedplumClient } from '@medplum/core';
import Stripe from 'stripe';

async function createLog(medplum: MedplumClient, category: string, payload: any) {
  await medplum.createResource({
    resourceType: 'Communication',
    status: 'completed',
    category: [{
      text: `stripe-webhook-${category}`
    }],
    payload: [{
      contentString: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
    }],
    sent: new Date().toISOString()
  });
}

async function handlePaymentIntentSucceeded(medplum: MedplumClient, stripe: Stripe, paymentIntent: Stripe.PaymentIntent) {
  // Log the webhook event payment intent
  await createLog(medplum, 'payment-intent-webhook', {
    paymentIntentId: paymentIntent.id,
    webhookMetadata: paymentIntent.metadata,
    hasWebhookMetadata: !!paymentIntent.metadata,
    customer: paymentIntent.customer
  });

  // Retrieve fresh payment intent data
  try {
    const freshPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
    await createLog(medplum, 'payment-intent-fresh', {
      paymentIntentId: freshPaymentIntent.id,
      freshMetadata: freshPaymentIntent.metadata,
      hasFreshMetadata: !!freshPaymentIntent.metadata,
      metadataKeys: Object.keys(freshPaymentIntent.metadata || {}),
      customer: freshPaymentIntent.customer
    });

    // Use the fresh payment intent data
    const metadata = freshPaymentIntent.metadata || {};
    const organizationId = metadata.organizationId;
    const priceId = metadata.priceId;

    if (!organizationId) {
      await createLog(medplum, 'error', {
        error: 'Missing organizationId in payment intent metadata',
        availableMetadata: metadata,
        freshPaymentIntentId: freshPaymentIntent.id
      });
      throw new Error('Missing organizationId in payment intent metadata');
    }

    await createLog(medplum, 'subscription-create', {
      customer: freshPaymentIntent.customer,
      priceId,
      paymentMethod: freshPaymentIntent.payment_method
    });

    const subscription = await stripe.subscriptions.create({
      customer: freshPaymentIntent.customer as string,
      items: [{ price: priceId }],
      default_payment_method: freshPaymentIntent.payment_method as string,
      metadata: { organizationId }
    });

    await createLog(medplum, 'subscription-created', {
      subscriptionId: subscription.id,
      status: subscription.status
    });

    return subscription;

  } catch (error) {
    await createLog(medplum, 'error', {
      message: 'Failed to retrieve fresh payment intent data',
      error: error instanceof Error ? error.message : 'Unknown error',
      paymentIntentId: paymentIntent.id
    });
    throw error;
  }
}

async function handleSubscriptionUpdated(medplum: MedplumClient, subscription: Stripe.Subscription) {
  await createLog(medplum, 'subscription-update', {
    subscriptionId: subscription.id,
    status: subscription.status,
    metadata: subscription.metadata
  });

  const metadata = subscription.metadata || {};
  const organizationId = metadata.organizationId;
  
  if (!organizationId) {
    await createLog(medplum, 'error', 'No organizationId in subscription metadata');
    return;
  }

  await createLog(medplum, 'fetch-org', { organizationId });
  const organization = await medplum.readResource('Organization', organizationId);
  
  const extensions = (organization.extension || []).filter(
    e => !e.url.startsWith('http://example.com/fhir/StructureDefinition/subscription-')
  );

  // Add subscription details as extensions
  const newExtensions = [
    {
      url: 'http://example.com/fhir/StructureDefinition/subscription-status',
      valueString: subscription.status
    },
    {
      url: 'http://example.com/fhir/StructureDefinition/subscription-plan',
      valueString: subscription.items.data[0]?.price?.id
    },
    {
      url: 'http://example.com/fhir/StructureDefinition/subscription-id',
      valueString: subscription.id
    },
    {
      url: 'http://example.com/fhir/StructureDefinition/subscription-period-end',
      valueDateTime: new Date(subscription.current_period_end * 1000).toISOString()
    }
  ];

  await createLog(medplum, 'org-update', {
    organizationId,
    extensions: newExtensions
  });
  
  await medplum.updateResource({
    ...organization,
    extension: [...extensions, ...newExtensions]
  });

  await createLog(medplum, 'success', 'Organization updated successfully');
}

async function handleSubscriptionCancelled(medplum: MedplumClient, subscription: Stripe.Subscription) {
  const metadata = subscription.metadata || {};
  const organizationId = metadata.organizationId;
  
  if (!organizationId) {
    await createLog(medplum, 'error', 'No organizationId in subscription metadata');
    return;
  }

  const organization = await medplum.readResource('Organization', organizationId);
  const extensions = (organization.extension || []).filter(
    e => !e.url.startsWith('http://example.com/fhir/StructureDefinition/subscription-')
  );

  // Add cancelled status and end date
  const cancelledAt = subscription.canceled_at || Date.now() / 1000;
  const newExtensions = [
    {
      url: 'http://example.com/fhir/StructureDefinition/subscription-status',
      valueString: 'cancelled'
    },
    {
      url: 'http://example.com/fhir/StructureDefinition/subscription-period-end',
      valueDateTime: new Date(cancelledAt * 1000).toISOString()
    }
  ];

  await createLog(medplum, 'subscription-cancelled', {
    organizationId,
    extensions: newExtensions
  });

  await medplum.updateResource({
    ...organization,
    extension: [...extensions, ...newExtensions]
  });
}

interface WebhookEvent extends BotEvent {
  input: {
    header?: Record<string, string>;
    body?: string;
    // Stripe webhook event properties
    id?: string;
    object?: string;
    api_version?: string;
    created?: number;
    data?: {
      object: any;
    };
    livemode?: boolean;
    pending_webhooks?: number;
    request?: any;
    type?: string;
  }
}

export async function handler(medplum: MedplumClient, event: WebhookEvent): Promise<any> {
  // Log the raw event structure
  await createLog(medplum, 'debug', {
    eventKeys: Object.keys(event),
    inputKeys: event.input ? Object.keys(event.input) : 'no input',
    headerKeys: event.input?.header ? Object.keys(event.input.header) : 'no headers',
    input: event.input
  });

  // Check for required secrets
  const stripeSecretKey = event.secrets?.['STRIPE_SECRET_KEY']?.valueString || event.secrets?.['STRIPE_SECRET_KEY'];
  const stripeWebhookSecret = event.secrets?.['STRIPE_WEBHOOK_SECRET']?.valueString || event.secrets?.['STRIPE_WEBHOOK_SECRET'];

  if (!stripeSecretKey || typeof stripeSecretKey !== 'string') {
    await createLog(medplum, 'error', 'Missing or invalid STRIPE_SECRET_KEY in bot secrets');
    throw new Error('Missing or invalid STRIPE_SECRET_KEY in bot secrets');
  }
  if (!stripeWebhookSecret || typeof stripeWebhookSecret !== 'string') {
    await createLog(medplum, 'error', 'Missing or invalid STRIPE_WEBHOOK_SECRET in bot secrets');
    throw new Error('Missing or invalid STRIPE_WEBHOOK_SECRET in bot secrets');
  }

  // Validate webhook input
  if (!event.input) {
    await createLog(medplum, 'error', 'No input provided in webhook event');
    throw new Error('No input provided in webhook event');
  }

  // Check if we have a direct Stripe event in the input
  if (event.input.type && event.input.data) {
    await createLog(medplum, 'info', 'Received direct Stripe event data');
    
    // Initialize Stripe with secret key
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16'
    });

    try {
      // Log the event data
      await createLog(medplum, 'event', {
        type: event.input.type,
        id: event.input.id,
        data: event.input.data
      });

      // Process the event based on type
      switch (event.input.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.input.data.object as Stripe.PaymentIntent;
          await handlePaymentIntentSucceeded(medplum, stripe, paymentIntent);
          break;
        case 'charge.succeeded':
          // For charge.succeeded, we'll check if it's associated with a payment intent
          // If so, we'll let the payment_intent.succeeded handler take care of it
          const charge = event.input.data.object as Stripe.Charge;
          await createLog(medplum, 'charge-succeeded', {
            chargeId: charge.id,
            paymentIntentId: charge.payment_intent,
            status: charge.status
          });
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.input.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(medplum, subscription);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionCancelled(medplum, event.input.data.object as Stripe.Subscription);
          break;
        default:
          await createLog(medplum, 'info', `Skipping unhandled event type: ${event.input.type}`);
      }

      await createLog(medplum, 'success', 'Webhook processed successfully');
      return { resourceType: 'Parameters', parameter: [] };
    } catch (error) {
      await createLog(medplum, 'error', {
        message: error instanceof Error ? error.message : 'Webhook processing failed',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  } else {
    await createLog(medplum, 'error', 'Invalid webhook data format');
    throw new Error('Invalid webhook data format');
  }
}