import { Organization } from '@medplum/fhirtypes';

export interface SubscriptionInfo {
  status: string;
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
