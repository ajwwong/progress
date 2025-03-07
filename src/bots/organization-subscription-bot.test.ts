import { MockClient } from '@medplum/mock';
import { expect, test, vi } from 'vitest';
import { handler } from './organization-subscription-bot';
import Stripe from 'stripe';

// Mock Stripe constructor and webhooks
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      webhooks: {
        constructEvent: vi.fn().mockImplementation((payload, signature, secret) => {
          return JSON.parse(payload);
        })
      }
    }))
  };
});

const medplum = new MockClient();

test('handles subscription update with secrets', async () => {
  const event = {
    input: {
      header: {
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            metadata: {
              organizationId: 'org-123'
            },
            current_period_end: Math.floor(Date.now() / 1000) + 86400,
            items: {
              data: [{
                price: {
                  id: 'price_123'
                }
              }]
            }
          }
        }
      })
    },
    secrets: {
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_123'
    }
  };

  // Mock the organization read
  medplum.readResource = vi.fn().mockResolvedValue({
    resourceType: 'Organization',
    id: 'org-123',
    extension: []
  });

  const result = await handler(medplum, event);
  expect(result).toEqual({ resourceType: 'Parameters', parameter: [] });
});

test('throws error when secrets are missing', async () => {
  const event = {
    input: {
      header: { 'stripe-signature': 'test_signature' },
      body: '{}'
    },
    secrets: {}
  };

  await expect(handler(medplum, event)).rejects.toThrow('Missing STRIPE_SECRET_KEY in bot secrets');
});
