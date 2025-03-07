import { BotEvent, MedplumClient } from '@medplum/core';
import Stripe from 'stripe';

interface SubscriptionLog {
  eventType: string;
  timestamp: string;
  details: Record<string, any>;
  status: 'info' | 'error' | 'success';
  error?: string;
}

interface WebhookLog {
  event: string;
  status: 'info' | 'error' | 'success';
  details: Record<string, any>;
  error?: string;
}

async function createSubscriptionLog(
  medplum: MedplumClient, 
  log: SubscriptionLog
): Promise<void> {
  await medplum.createResource({
    resourceType: 'Communication',
    status: 'completed',
    sent: new Date().toISOString(),
    payload: [{
      contentString: JSON.stringify(log, null, 2)
    }]
  });
}

async function logWebhookEvent(
  medplum: MedplumClient,
  log: WebhookLog
): Promise<void> {
  await medplum.createResource({
    resourceType: 'Communication',
    status: 'completed',
    sent: new Date().toISOString(),
    category: [{
      text: `stripe-webhook-${log.event}`
    }],
    payload: [{
      contentString: JSON.stringify({
        timestamp: new Date().toISOString(),
        status: log.status,
        details: log.details,
        ...(log.error && { error: log.error })
      }, null, 2)
    }]
  });
}

async function handlePaymentIntentSucceeded(medplum: MedplumClient, stripe: Stripe, paymentIntent: Stripe.PaymentIntent) {
  try {
    const freshPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
    
    await logWebhookEvent(medplum, {
      event: 'payment_intent.succeeded',
      status: 'info',
      details: {
        paymentIntentId: freshPaymentIntent.id,
        metadata: freshPaymentIntent.metadata,
        customer: freshPaymentIntent.customer,
        paymentMethod: freshPaymentIntent.payment_method
      }
    });

    const metadata = freshPaymentIntent.metadata || {};
    const { organizationId, priceId } = metadata;

    if (!organizationId) {
      throw new Error('Missing organizationId in payment intent metadata');
    }

    // First, attach payment method to customer
    if (!freshPaymentIntent.payment_method || !freshPaymentIntent.customer) {
      throw new Error('Missing payment method or customer');
    }

    // Directly attach the payment method to the customer
    try {
      await stripe.paymentMethods.attach(freshPaymentIntent.payment_method as string, {
        customer: freshPaymentIntent.customer as string,
      });

      await logWebhookEvent(medplum, {
        event: 'payment_method.attached',
        status: 'success',
        details: {
          paymentMethodId: freshPaymentIntent.payment_method,
          customerId: freshPaymentIntent.customer
        }
      });

      // Set as default payment method
      await stripe.customers.update(freshPaymentIntent.customer as string, {
        invoice_settings: {
          default_payment_method: freshPaymentIntent.payment_method as string,
        },
      });

      await logWebhookEvent(medplum, {
        event: 'customer.updated',
        status: 'success',
        details: {
          customerId: freshPaymentIntent.customer,
          defaultPaymentMethod: freshPaymentIntent.payment_method
        }
      });

      // Now create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: freshPaymentIntent.customer as string,
        items: [{ price: priceId }],
        default_payment_method: freshPaymentIntent.payment_method as string,
        metadata: { organizationId }
      });

      await logWebhookEvent(medplum, {
        event: 'subscription.created',
        status: 'success',
        details: {
          subscriptionId: subscription.id,
          status: subscription.status,
          organizationId,
          customer: freshPaymentIntent.customer,
          paymentMethod: freshPaymentIntent.payment_method
        }
      });

      return subscription;

    } catch (attachError: any) {
      // If the payment method is already attached, this is fine
      if (attachError.code === 'resource_already_exists') {
        await logWebhookEvent(medplum, {
          event: 'payment_method.already_attached',
          status: 'info',
          details: {
            paymentMethodId: freshPaymentIntent.payment_method,
            customerId: freshPaymentIntent.customer
          }
        });
      } else {
        throw attachError;
      }
    }

  } catch (error) {
    await logWebhookEvent(medplum, {
      event: 'payment_intent.error',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        paymentIntentId: paymentIntent.id,
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    throw error;
  }
}

async function handleSubscriptionUpdated(medplum: MedplumClient, subscription: Stripe.Subscription) {
  await logWebhookEvent(medplum, {
    event: 'subscription.updated',
    status: 'info',
    details: {
      subscriptionId: subscription.id,
      status: subscription.status,
      metadata: subscription.metadata
    }
  });

  const metadata = subscription.metadata || {};
  const organizationId = metadata.organizationId;
  
  if (!organizationId) {
    await logWebhookEvent(medplum, {
      event: 'subscription.error',
      status: 'error',
      error: 'No organizationId in subscription metadata',
      details: { subscriptionId: subscription.id }
    });
    return;
  }

  await logWebhookEvent(medplum, {
    event: 'organization.fetch',
    status: 'info',
    details: { organizationId }
  });

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

  await logWebhookEvent(medplum, {
    event: 'organization.update',
    status: 'info',
    details: {
      organizationId,
      extensions: newExtensions
    }
  });
  
  await medplum.updateResource({
    ...organization,
    extension: [...extensions, ...newExtensions]
  });

  await logWebhookEvent(medplum, {
    event: 'organization.updated',
    status: 'success',
    details: { organizationId }
  });
}

async function handleSubscriptionCancelled(medplum: MedplumClient, subscription: Stripe.Subscription) {
  const metadata = subscription.metadata || {};
  const organizationId = metadata.organizationId;
  
  if (!organizationId) {
    await logWebhookEvent(medplum, {
      event: 'subscription.error',
      status: 'error',
      error: 'No organizationId in subscription metadata',
      details: { subscriptionId: subscription.id }
    });
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

  await logWebhookEvent(medplum, {
    event: 'subscription.cancelled',
    status: 'info',
    details: {
      organizationId,
      extensions: newExtensions
    }
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
  await logWebhookEvent(medplum, {
    event: 'debug',
    status: 'info',
    details: {
      eventKeys: Object.keys(event),
      inputKeys: event.input ? Object.keys(event.input) : 'no input',
      headerKeys: event.input?.header ? Object.keys(event.input.header) : 'no headers',
      input: event.input
    }
  });

  // Check for required secrets
  const stripeSecretKey = event.secrets?.['STRIPE_SECRET_KEY']?.valueString || event.secrets?.['STRIPE_SECRET_KEY'];
  const stripeWebhookSecret = event.secrets?.['STRIPE_WEBHOOK_SECRET']?.valueString || event.secrets?.['STRIPE_WEBHOOK_SECRET'];

  if (!stripeSecretKey || typeof stripeSecretKey !== 'string') {
    await logWebhookEvent(medplum, {
      event: 'error',
      status: 'error',
      error: 'Missing or invalid STRIPE_SECRET_KEY in bot secrets',
      details: {}
    });
    throw new Error('Missing or invalid STRIPE_SECRET_KEY in bot secrets');
  }
  if (!stripeWebhookSecret || typeof stripeWebhookSecret !== 'string') {
    await logWebhookEvent(medplum, {
      event: 'error',
      status: 'error',
      error: 'Missing or invalid STRIPE_WEBHOOK_SECRET in bot secrets',
      details: {}
    });
    throw new Error('Missing or invalid STRIPE_WEBHOOK_SECRET in bot secrets');
  }

  // Validate webhook input
  if (!event.input) {
    await logWebhookEvent(medplum, {
      event: 'error',
      status: 'error',
      error: 'No input provided in webhook event',
      details: {}
    });
    throw new Error('No input provided in webhook event');
  }

  // Check if we have a direct Stripe event in the input
  if (event.input.type && event.input.data) {
    await logWebhookEvent(medplum, {
      event: 'info',
      status: 'info',
      details: {
        message: 'Received direct Stripe event data'
      }
    });
    
    // Initialize Stripe with secret key
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16'
    });

    try {
      // Log the event data
      await logWebhookEvent(medplum, {
        event: 'event',
        status: 'info',
        details: {
          type: event.input.type,
          id: event.input.id,
          data: event.input.data
        }
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
          await logWebhookEvent(medplum, {
            event: 'charge-succeeded',
            status: 'info',
            details: {
              chargeId: charge.id,
              paymentIntentId: charge.payment_intent,
              status: charge.status
            }
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
          await logWebhookEvent(medplum, {
            event: 'info',
            status: 'info',
            details: {
              message: `Skipping unhandled event type: ${event.input.type}`
            }
          });
      }

      await logWebhookEvent(medplum, {
        event: 'success',
        status: 'success',
        details: {
          message: 'Webhook processed successfully'
        }
      });
      return { resourceType: 'Parameters', parameter: [] };
    } catch (error) {
      await logWebhookEvent(medplum, {
        event: 'error',
        status: 'error',
        error: error instanceof Error ? error.message : 'Webhook processing failed',
        details: {
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  } else {
    await logWebhookEvent(medplum, {
      event: 'error',
      status: 'error',
      error: 'Invalid webhook data format',
      details: {}
    });
    throw new Error('Invalid webhook data format');
  }
}
