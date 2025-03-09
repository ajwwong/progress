import { Organization } from '@medplum/fhirtypes';
import { STRIPE_CONFIG } from '../../../../config/stripe-config';
import { SubscriptionInfo, SubscriptionStatus } from './types';

export function getSubscriptionInfo(organization: Organization): SubscriptionInfo | undefined {
  if (!organization.extension) return undefined;

  const status = organization.extension.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-status'
  )?.valueString as SubscriptionStatus || 'free';

  const planId = organization.extension.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-plan'
  )?.valueString;

  const periodEnd = organization.extension.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-period-end'
  )?.valueDateTime;

  if (!planId || !periodEnd) return undefined;

  // Find the plan configuration that matches the planId
  const planConfig = Object.values(STRIPE_CONFIG.TEST.STANDARD.plans).find(
    plan => plan.priceId === planId
  );

  if (!planConfig) return undefined;
  
  return {
    status,
    planId,
    periodEnd,
    price: planConfig.amount / 100,
    interval: planConfig.interval
  };
}

export function getBadgeColor(status: SubscriptionStatus): string {
  switch (status) {
    case 'active':
      return 'green';
    case 'pending':
      return 'yellow';
    case 'cancelled':
      return 'red';
    case 'free':
    default:
      return 'blue';
  }
}
