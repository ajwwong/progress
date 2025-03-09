import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Organization, Extension, Practitioner } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';
import { SubscriptionStatus, UsageData } from '../pages/profile/components/subscription/types';

const FREE_SESSIONS_PER_MONTH = 10;
const SESSION_USAGE_URL = 'http://example.com/fhir/StructureDefinition/subscription-sessions-used';
const SESSION_LIMIT_URL = 'http://example.com/fhir/StructureDefinition/subscription-sessions-allowed';
const SUBSCRIPTION_STATUS_URL = 'http://example.com/fhir/StructureDefinition/subscription-status';

export function useOrganizationUsage() {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Practitioner;
  const [organization, setOrganization] = useState<Organization>();
  const [usageData, setUsageData] = useState<UsageData>({
    sessionsUsed: 0,
    sessionsLimit: FREE_SESSIONS_PER_MONTH,
    subscriptionStatus: 'free',
    lastResetDate: new Date().toISOString()
  });

  // Fetch the organization associated with the current user
  const fetchOrganization = async () => {
    if (!profile) return;

    try {
      // First check profile's meta.compartment
      const orgReference = profile.meta?.compartment?.find(
        c => c.reference?.startsWith('Organization/')
      )?.reference;

      if (!orgReference) {
        // If no compartment, check membership
        const membership = await medplum.getProfile();
        const membershipOrgRef = membership?.extension?.find(
          (e: { url: string }) => e.url === 'http://example.com/fhir/StructureDefinition/current-organization'
        )?.valueReference?.reference;

        if (!membershipOrgRef) {
          throw new Error('No organization found');
        }

        const org = await medplum.readReference<Organization>({ reference: membershipOrgRef });
        setOrganization(org);
      } else {
        const org = await medplum.readReference<Organization>({ reference: orgReference });
        setOrganization(org);
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
    }
  };

  const loadUsageData = async () => {
    if (!organization) return;

    const sessionsUsed = organization.extension?.find(
      (e: Extension) => e.url === SESSION_USAGE_URL
    )?.valueInteger || 0;

    const sessionsLimit = organization.extension?.find(
      (e: Extension) => e.url === SESSION_LIMIT_URL
    )?.valueInteger || FREE_SESSIONS_PER_MONTH;

    const subscriptionStatus = (organization.extension?.find(
      (e: Extension) => e.url === SUBSCRIPTION_STATUS_URL
    )?.valueString as SubscriptionStatus) || 'free';

    // Check if we need to reset the counter (new month)
    const lastResetDate = new Date(organization.extension?.find(
      (e: Extension) => e.url === 'http://example.com/fhir/StructureDefinition/session-last-reset'
    )?.valueDateTime || new Date().toISOString());

    const currentDate = new Date();
    
    if (lastResetDate.getMonth() !== currentDate.getMonth() || 
        lastResetDate.getFullYear() !== currentDate.getFullYear()) {
      await updateUsage(0, currentDate.toISOString(), subscriptionStatus);
    } else {
      setUsageData({
        sessionsUsed,
        sessionsLimit,
        subscriptionStatus,
        lastResetDate: lastResetDate.toISOString()
      });
    }
  };

  const updateUsage = async (newCount: number, resetDate: string, status: SubscriptionStatus) => {
    if (!organization) return;

    const updatedOrg: Organization = {
      ...organization,
      extension: [
        ...(organization.extension || []).filter((e: Extension) => 
          e.url !== SESSION_USAGE_URL &&
          e.url !== 'http://example.com/fhir/StructureDefinition/session-last-reset'
        ),
        {
          url: SESSION_USAGE_URL,
          valueInteger: newCount
        },
        {
          url: 'http://example.com/fhir/StructureDefinition/session-last-reset',
          valueDateTime: resetDate
        }
      ]
    };

    const result = await medplum.updateResource(updatedOrg);
    setOrganization(result);
    await loadUsageData();
  };

  const incrementUsage = async () => {
    const newCount = usageData.sessionsUsed + 1;
    await updateUsage(newCount, usageData.lastResetDate, usageData.subscriptionStatus);
  };

  // Load organization when profile is available
  useEffect(() => {
    if (profile) {
      fetchOrganization();
    }
  }, [profile]);

  // Load usage data when organization is available
  useEffect(() => {
    if (organization) {
      loadUsageData();
    }
  }, [organization]);

  return {
    organization,
    usageData,
    updateUsage,
    canUseSession: usageData.subscriptionStatus === 'active' || usageData.sessionsUsed < usageData.sessionsLimit
  };
} 