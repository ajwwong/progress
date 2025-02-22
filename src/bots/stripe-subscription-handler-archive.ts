import { BotEvent, createReference, MedplumClient } from '@medplum/core';
import { Account, Invoice, Money, Communication, OperationOutcome } from '@medplum/fhirtypes';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe('sk_test_51QbTYlIhrZKLmPheWQseDVQyhBpxkXm3XYi94NVM3VqRZA2Tto7YS4yvmaf6UpVfmvlczGtGEaYCzOAoFNTUYXdu006ORa4LmE');

async function logBotStep(medplum: MedplumClient, customerId: string, step: { type: 'info' | 'error', message: string, details?: any }) {
  await medplum.createResource({
    resourceType: 'Communication',
    status: 'completed',
    sender: {
      reference: 'Bot/stripe-subscription-handler'
    },
    subject: {
      reference: `Patient/${customerId}`
    },
    sent: new Date().toISOString(),
    payload: [
      {
        contentString: `[${step.type.toUpperCase()}] ${step.message}`
      },
      {
        contentString: step.details ? JSON.stringify(step.details, null, 2) : undefined
      }
    ]
  });
}

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const parameters = event.input.parameter || [];
  const paymentMethodId = parameters.find(p => p.name === 'paymentMethodId')?.valueString;
  const customerId = parameters.find(p => p.name === 'customerId')?.valueString;
  const priceId = parameters.find(p => p.name === 'priceId')?.valueString;

  if (!paymentMethodId || !customerId) {
    await logBotStep(medplum, customerId || 'unknown', {
      type: 'error',
      message: 'Missing required parameters',
      details: { paymentMethodId, customerId, priceId }
    });
    return {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'invalid', details: { text: 'Missing required parameters' } }]
    };
  }

  try {
    await logBotStep(medplum, customerId, {
      type: 'info',
      message: 'Looking up user details'
    });

    const user = await medplum.readResource('Patient', customerId);
    const email = user.telecom?.find(t => t.system === 'email')?.value;

    if (!email) {
      throw new Error('User email not found');
    }

    await logBotStep(medplum, customerId, {
      type: 'info',
      message: 'Finding/Creating Stripe customer',
      details: { email }
    });

    let customer = await findOrCreateCustomer(email);
    
    await logBotStep(medplum, customerId, {
      type: 'info',
      message: 'Attaching payment method',
      details: { customerId: customer.id, paymentMethodId }
    });

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    await logBotStep(medplum, customerId, {
      type: 'info',
      message: 'Setting default payment method'
    });

    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    await logBotStep(medplum, customerId, {
      type: 'info',
      message: 'Creating subscription',
      details: { priceId }
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    await logBotStep(medplum, customerId, {
      type: 'info',
      message: 'Subscription created successfully',
      details: { subscriptionId: subscription.id }
    });

    return {
      resourceType: 'Parameters',
      parameter: [{
        name: 'subscriptionId',
        valueString: subscription.id
      }]
    };

  } catch (error) {
    await logBotStep(medplum, customerId, {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error
    });

    return {
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'processing',
        details: {
          text: error instanceof Error ? error.message : 'Subscription creation failed'
        }
      }]
    };
  }
}

async function findOrCreateCustomer(email: string): Promise<Stripe.Customer> {
  const customers = await stripe.customers.list({ email });
  if (customers.data.length > 0) {
    return customers.data[0];
  }
  return await stripe.customers.create({ email });
}

async function handleSubscription(medplum: MedplumClient, stripeSubscription: Stripe.Subscription): Promise<boolean> {
  console.log('[DEBUG] Starting subscription handler');
  
  const accountId = stripeSubscription.customer as string;
  if (!accountId) {
    console.error('[ERROR] No customer ID found in subscription');
    return false;
  }

  try {
    // First try to find existing account
    let account = await medplum.searchOne('Account', 'identifier=' + accountId) as Account;
    console.log('[DEBUG] Search result:', JSON.stringify(account, null, 2));

    if (!account) {
      // Create if not found
      account = await medplum.createResourceIfNoneExist<Account>(
        {
          resourceType: 'Account',
          identifier: [{
            system: 'https://stripe.com/account/id',
            value: accountId,
          }],
          status: 'active'
        },
        'identifier=' + accountId
      );
      console.log('[DEBUG] Created account:', JSON.stringify(account, null, 2));
    }

    return true;
  } catch (err) {
    console.error('[ERROR] Error in subscription handler:', err);
    return false;
  }
}

async function handleInvoice(medplum: MedplumClient, stripeInvoice: Stripe.Invoice): Promise<boolean> {
  console.log('[DEBUG] Starting invoice handler');
  
  const id = stripeInvoice.id;
  const accountId = stripeInvoice.customer as string;
  
  if (!id || !accountId) {
    console.error('[ERROR] Missing invoice ID or customer ID');
    return false;
  }

  // Check if the invoice is related to a subscription
  const isSubscriptionPayment = stripeInvoice.subscription !== null;
  if (isSubscriptionPayment) {
    console.log('[DEBUG] This is a subscription payment for subscription ID:', stripeInvoice.subscription);
  }

  try {
    // First try simple search for account
    let account = await medplum.searchOne('Account', 'identifier=' + accountId);
    console.log('[DEBUG] Simple account search result:', JSON.stringify(account, null, 2));

    if (!account) {
      // Try creating if not found
      account = await medplum.createResource<Account>({
        resourceType: 'Account',
        identifier: [{
          system: 'https://stripe.com/account/id',
          value: accountId,
        }],
        status: 'active'
      });
      console.log('[DEBUG] Created new account:', JSON.stringify(account, null, 2));
    }

    const invoice = await medplum.createResource<Invoice>({
      resourceType: 'Invoice',
      identifier: [{
        system: 'https://stripe.com/invoice/id',
        value: id,
      }],
      status: getInvoiceStatus(stripeInvoice.status),
      account: createReference(account),
      totalGross: {
        value: stripeInvoice.amount_due / 100,
        currency: stripeInvoice.currency.toUpperCase() as Money['currency'],
      },
      totalNet: {
        value: stripeInvoice.amount_paid / 100,
        currency: stripeInvoice.currency.toUpperCase() as Money['currency'],
      }
    });
    console.log('[DEBUG] Created invoice:', JSON.stringify(invoice, null, 2));

    return true;
  } catch (err) {
    console.error('[ERROR] Error in invoice handler:', err);
    return false;
  }
}

function getInvoiceStatus(status: Stripe.Invoice.Status | null): string {
  switch (status) {
    case 'paid': return 'balanced';
    case 'open': return 'issued';
    case 'uncollectible':
    case 'void': return 'cancelled';
    default: return 'draft';
  }
}

async function logError(medplum: MedplumClient, customerId: string, error: any): Promise<void> {
  try {
    const communication = await medplum.createResource<Communication>({
      resourceType: 'Communication',
      status: 'completed',
      subject: { reference: `Patient/${customerId}` },
      sent: new Date().toISOString(),
      recipient: [{ reference: `Patient/${customerId}` }],
      payload: [
        {
          contentString: `Error Type: ${error.type || 'ERROR'}`,
        },
        {
          contentString: `Message: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        },
        {
          contentString: `Stack: ${error instanceof Error ? error.stack : 'No stack trace'}`,
        }
      ]
    });
    console.log('Created communication log:', communication.id);
  } catch (logError) {
    console.error('Failed to create communication log:', logError);
  }
}