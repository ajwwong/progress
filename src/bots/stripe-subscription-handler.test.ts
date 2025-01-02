import { MockClient } from '@medplum/mock';
import { expect, test } from 'vitest';
import { handler } from './stripe-subscription-handler';

const medplum = new MockClient();

test('handles new subscription creation', async () => {
  console.log('Starting subscription creation test');
  
  const input = {
    id: 'evt_123',
    object: 'event',
    api_version: '2022-11-15',
    created: 1679934466,
    data: {
      object: {
        id: 'sub_123',
        object: 'subscription',
        customer: 'cus_123',
        status: 'active',
        current_period_start: 1677649200,
        current_period_end: 1680327600,
        items: {
          object: 'list',
          data: [{
            price: {
              nickname: 'Premium Plan',
              unit_amount: 2000
            }
          }]
        }
      }
    },
    type: 'customer.subscription.created'
  };

  const result = await handler(medplum, {
    bot: { reference: 'Bot/123' },
    input,
    contentType: 'application/json',
    secrets: {}
  });

  expect(result).toBe(true);

  // Wait for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 500));

  // Try multiple search approaches to debug
  const searchCriteria = 'identifier=https://stripe.com/account/id|cus_123';
  console.log('Testing with search criteria:', searchCriteria);
  
  const account = await medplum.searchOne('Account', searchCriteria);
  console.log('Test search result:', account);
  
  expect(account).toBeDefined();
  expect(account?.status).toBe('active');
  expect(account?.identifier?.[0]?.system).toBe('https://stripe.com/account/id');
  expect(account?.identifier?.[0]?.value).toBe('cus_123');
});

test('handles invoice paid', async () => {
  const input = {
    id: 'evt_456',
    object: 'event',
    api_version: '2022-11-15',
    created: 1679934466,
    data: {
      object: {
        id: 'in_123',
        object: 'invoice',
        customer: 'cus_123',
        amount_due: 2000,
        amount_paid: 2000,
        currency: 'usd',
        status: 'paid'
      }
    },
    type: 'invoice.paid'
  };

  const result = await handler(medplum, {
    bot: { reference: 'Bot/123' },
    input,
    contentType: 'application/json',
    secrets: {}
  });

  expect(result).toBe(true);

  // Wait for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 500));

  const invoice = await medplum.searchOne('Invoice', 'identifier=https://stripe.com/invoice/id|in_123');
  expect(invoice).toBeDefined();
  expect(invoice?.status).toBe('balanced');
});