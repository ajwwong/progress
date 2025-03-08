import { Organization } from '@medplum/fhirtypes';
import { STRIPE_CONFIG } from '../../../../config/stripe-config';
import { SubscriptionInfo } from './types';

export function getSubscriptionInfo(organization: Organization): SubscriptionInfo | undefined {
  if (!organization.extension) return undefined;

  const status = organization.extension.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-status'
  )?.valueString;

  const planId = organization.extension.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-plan'
  )?.valueString;

  const periodEnd = organization.extension.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-period-end'
  )?.valueDateTime;

  if (!status || !planId || !periodEnd) return undefined;

  const planConfig = STRIPE_CONFIG.TEST.PREMIUM;
  
  return {
    status,
    planId,
    periodEnd,
    price: planConfig.amount / 100,
    interval: planConfig.interval
  };
}
