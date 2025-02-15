import { BotEvent, MedplumClient } from '@medplum/core';
import Stripe from 'stripe';

const stripe = new Stripe('sk_test_51QbTYlIhrZKLmPheWQseDVQyhBpxkXm3XYi94NVM3VqRZA2Tto7YS4yvmaf6UpVfmvlczGtGEaYCzOAoFNTUYXdu006ORa4LmE', {
  apiVersion: '2023-10-16'
});

async function handleSubscriptionUpdated(medplum: MedplumClient, subscription: Stripe.Subscription) {
  const metadata = subscription.metadata || {};
  const practitionerId = metadata.practitionerId;
  
  if (!practitionerId) {
    console.log('No practitionerId in subscription metadata');
    return;
  }

  const practitioner = await medplum.readResource('Practitioner', practitionerId);
  const extensions = (practitioner.extension || []).filter(
    e => e.url !== 'http://example.com/fhir/StructureDefinition/pro-subscription'
  );

  // Update pro status based on subscription status
  extensions.push({
    url: 'http://example.com/fhir/StructureDefinition/pro-subscription',
    valueBoolean: subscription.status === 'active'
  });

  await medplum.updateResource({
    ...practitioner,
    extension: extensions
  });
}

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const signature = event.input.header?.['stripe-signature'];
  const payload = event.input.body;

  try {
    const stripeEvent = stripe.webhooks.constructEvent(
      payload,
      signature,
      'whsec_your_webhook_signing_secret'
    );

    switch (stripeEvent.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionUpdated(medplum, stripeEvent.data.object as Stripe.Subscription);
        break;
    }

    return { resourceType: 'Parameters', parameter: [] };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'processing',
        details: { text: error instanceof Error ? error.message : 'Webhook processing failed' }
      }]
    };
  }
}
