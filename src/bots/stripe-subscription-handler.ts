/*import { BotEvent, MedplumClient } from '@medplum/core';
import Stripe from 'stripe';

const stripe = new Stripe('sk_test_51QbTYlIhrZKLmPheWQseDVQyhBpxkXm3XYi94NVM3VqRZA2Tto7YS4yvmaf6UpVfmvlczGtGEaYCzOAoFNTUYXdu006ORa4LmE', {
  apiVersion: '2023-10-16'
});

// Price ID for Claude AI Transcription ($0.99/month)
const SUBSCRIPTION_PRICE_ID = 'price_1QrxQOIhrZKLmPheB8fmQEjM';

interface CommunicationPayload {
  contentString: string;
}

async function logSubscriptionStep(
  medplum: MedplumClient, 
  practitionerId: string, 
  message: string, 
  details?: Record<string, unknown>
): Promise<void> {
  const payload: CommunicationPayload[] = [
    { contentString: message }
  ];
  
  if (details) {
    payload.push({ 
      contentString: JSON.stringify(details, null, 2) 
    });
  }
  
  try {
    const communication = await medplum.createResource({
      resourceType: 'Communication',
      status: 'completed',
      sender: { reference: 'Bot/42b0ee1a-345b-4fd0-aa41-2493434af9e9' },
      subject: { reference: `Practitioner/${practitionerId}` },
      recipient: [{ reference: `Practitioner/${practitionerId}` }],
      sent: new Date().toISOString(),
      payload
    });
    console.log('Created communication log:', communication.id);
  } catch (error) {
    console.log('Failed to create communication log:', error);
  }
}

async function checkExistingSubscription(customerId: string): Promise<Stripe.Subscription | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    price: SUBSCRIPTION_PRICE_ID,
    status: 'all',
    limit: 1
  });
  
  return subscriptions.data[0] || null;a
}

async function getSubscriptionStatus(subscription: Stripe.Subscription) {
  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;
  
  return {
    subscriptionStatus: subscription.status,
    invoiceStatus: invoice?.status,
    paymentStatus: paymentIntent?.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null
  };
}

async function updateProfileToProStatus(medplum: MedplumClient, practitionerId: string): Promise<void> {
  try {
    const practitioner = await medplum.readResource<PractitionerResource>('Practitioner', practitionerId);
    
    // Remove existing pro subscription extension if it exists
    const extensions = (practitioner.extension || []).filter(
      e => e.url !== 'http://example.com/fhir/StructureDefinition/pro-subscription'
    );

    // Add pro subscription extension
    extensions.push({
      url: 'http://example.com/fhir/StructureDefinition/pro-subscription',
      valueBoolean: true
    });

    // Update the practitioner resource
    const updatedPractitioner = {
      ...practitioner,
      extension: extensions
    };

    await medplum.updateResource(updatedPractitioner);
    await logSubscriptionStep(medplum, practitionerId, 'Profile updated to PRO status');
  } catch (error) {
    console.error('Failed to update profile to PRO:', error);
    await logSubscriptionStep(medplum, practitionerId, 'Failed to update profile to PRO status', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

interface BotEventParameter {
  name: string;
  valueString?: string;
}

function getParameterValue(parameters: BotEventParameter[], name: string): string | undefined {
  return parameters.find(p => p.name === name)?.valueString;
}

interface BotEventInput {
  parameter?: BotEventParameter[];
}

interface BotEvent {
  input: BotEventInput;
}

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  console.log('Bot received input:', event.input);
  
  const parameters = event.input.parameter || [];
  const paymentMethodId = getParameterValue(parameters, 'paymentMethodId');
  const customerId = getParameterValue(parameters, 'customerId');
  
  if (!paymentMethodId || !customerId) {
    return {
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'invalid',
        details: {
          text: 'Missing required parameters: paymentMethodId and customerId are required'
        }
      }]
    };
  }

  try {
    const user = await medplum.readResource('Practitioner', customerId);
    console.log('Practitioner telecom:', user.telecom);
    const email = user.telecom?.find(t => t.system === 'email')?.value;

    if (!email) {
      throw new Error('Email not found for practitioner');
    }

    console.log('Looking up Stripe customer for email:', email);
    let customer;
    const customers = await stripe.customers.list({ email });
    
    if (customers.data.length > 0) {
      customer = customers.data[0];
      console.log('Found existing Stripe customer:', customer.id);
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: {
          practitionerId: customerId
        }
      });
      console.log('Created new Stripe customer:', customer.id);
    }

    console.log('Attaching payment method to customer...');
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    console.log('Setting as default payment method...');
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Check for existing subscription
    const existingSubscription = await checkExistingSubscription(customer.id);
    
    if (existingSubscription) {
      const status = await getSubscriptionStatus(existingSubscription);
      await logSubscriptionStep(medplum, customerId, 'Found existing subscription', status);

      if (['active', 'trialing'].includes(existingSubscription.status)) {
        return {
          resourceType: 'Parameters',
          parameter: [
            { name: 'status', valueString: 'existing_active' },
            { name: 'subscriptionId', valueString: existingSubscription.id },
            { name: 'details', valueString: JSON.stringify(status) }
          ]
        };
      }
    }

    // Create new subscription
    await logSubscriptionStep(medplum, customerId, 'Creating new subscription', {
      priceId: SUBSCRIPTION_PRICE_ID,
      customerId: customer.id
    });

    await logSubscriptionStep(medplum, customerId, 'Creating Stripe subscription', {
      priceId: SUBSCRIPTION_PRICE_ID,
      customerId: customer.id
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: SUBSCRIPTION_PRICE_ID }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        practitionerId: customerId,
        webhookBotId: '8c3a6e7d-374b-43e1-b6b3-2a27ebe6f747'
      }
    });

    // Get the payment intent
    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

    if (paymentIntent.status === 'requires_confirmation') {
      try {
        await logSubscriptionStep(medplum, customerId, 'Confirming payment', {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret
        });

        const result = await stripe.paymentIntents.confirm(paymentIntent.id);
        if (result.status === 'succeeded') {
          await updateProfileToProStatus(medplum, customerId);
        }

        // Return client secret for frontend confirmation
        return {
          resourceType: 'Parameters',
          parameter: [
            { name: 'status', valueString: 'requires_confirmation' },
            { name: 'paymentMethodId', valueString: paymentMethodId },
            { name: 'email', valueString: email },
            { name: 'stripeCustomerId', valueString: customer.id },
            { name: 'subscriptionId', valueString: subscription.id },
            { name: 'clientSecret', valueString: paymentIntent.client_secret }
          ]
        };
      } catch (error) {
        await logSubscriptionStep(medplum, customerId, 'Payment confirmation failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    }

    await logSubscriptionStep(medplum, customerId, 'Subscription created', {
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
    });

    const status = await getSubscriptionStatus(subscription);
    await logSubscriptionStep(medplum, customerId, 'Subscription created', status);

    await updateProfileToProStatus(medplum, customerId);

    return {
      resourceType: 'Parameters',
      parameter: [
        { name: 'status', valueString: subscription.status },
        { name: 'paymentMethodId', valueString: paymentMethodId },
        { name: 'email', valueString: email },
        { name: 'stripeCustomerId', valueString: customer.id },
        { name: 'subscriptionId', valueString: subscription.id },
        { name: 'details', valueString: JSON.stringify(status) }
      ]
    };

  } catch (error) {
    // Use console.log instead of console.error
    console.log('Error processing request:', error);
    return {
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'processing',
        details: {
          text: error instanceof Error ? error.message : 'Failed to process request'
        }
      }]
    };
  }
}*/