import { BotEvent, createReference, MedplumClient } from '@medplum/core';
import { Account, Invoice, Money } from '@medplum/fhirtypes';
import type Stripe from 'stripe';

export async function handler(medplum: MedplumClient, event: BotEvent<Record<string, any>>): Promise<any> {
  const input = event.input;
  const eventType = input.type || input['type'];
  const stripeEvent = input['data']['object'];

  console.log('Processing event type:', eventType);
  console.log('Stripe event:', stripeEvent);

  switch (eventType) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      return handleSubscription(medplum, stripeEvent);
    case 'invoice.paid':
      return handleInvoice(medplum, stripeEvent);
    default:
      console.log('Unhandled event type:', eventType);
      return false;
  }
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
    let account = await medplum.searchOne('Account', 'identifier=' + accountId);
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