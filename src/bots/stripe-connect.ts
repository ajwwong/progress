/*import { BotEvent, MedplumClient } from '@medplum/core';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const { practitionerId } = event.input as { practitionerId: string };

  try {
    // Create Stripe Connect account link
    const account = await stripe.accounts.create({
      type: 'standard',
      metadata: {
        practitionerId
      }
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.APP_URL}/provider/stripe/refresh`,
      return_url: `${process.env.APP_URL}/provider/stripe/return`,
      type: 'account_onboarding'
    });

    // Store Stripe account reference in Medplum
    await medplum.createResource({
      resourceType: 'Organization',
      name: 'Stripe Connect Account',
      identifier: [{
        system: 'https://stripe.com/connect',
        value: practitionerId
      }],
      extension: [{
        url: 'https://stripe.com/account_id',
        valueString: account.id
      }]
    });

    return { url: accountLink.url };
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    return { 
      error: true, 
      message: error instanceof Error ? error.message : 'Failed to create Stripe account'
    };
  }
}*/