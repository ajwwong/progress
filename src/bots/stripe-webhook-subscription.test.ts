import { MedplumClient } from '@medplum/core';
import { MockClient } from '@medplum/mock';
import { handler } from '../stripe-create-subscription-invoice';

describe('Stripe Subscription Bot', () => {
  let medplum: MedplumClient;

  beforeEach(() => {
    medplum = new MockClient();
  });

  test('handles subscription.created event', async () => {
    const event = {
      input: {
        type: 'subscription_schedule.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            start_date: Date.now() / 1000,
            phases: [{
              items: [{
                price: {
                  nickname: 'Premium Plan'
                }
              }]
            }]
          }
        }
      }
    };

    const result = await handler(medplum, event);
    expect(result).toBe(true);
  });
});
