import { Organization } from '@medplum/fhirtypes';

export type SubscriptionStatus = 'active' | 'cancelled' | 'free' | 'pending';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  planId: string;
  periodEnd: string;
  price?: number;
  interval?: string;
}

export interface PaymentFormProps {
  clientSecret: string;
  onReady: () => void;
}

export interface OrganizationDetailsProps {
  organization: Organization;
  onSave: (updatedOrg: Organization) => Promise<void>;
}

export interface SubscriptionDetailsProps {
  subscriptionInfo: SubscriptionInfo;
}

export interface UsageData {
  sessionsUsed: number;
  sessionsLimit: number;
  subscriptionStatus: SubscriptionStatus;
  lastResetDate: string;
}
