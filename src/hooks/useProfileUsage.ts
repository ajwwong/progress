import { useMedplum } from '@medplum/react';
import { Organization, Extension } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';

const FREE_SESSIONS_PER_MONTH = 10;
const USAGE_EXTENSION_URL = 'http://example.com/fhir/StructureDefinition/session-usage';

interface UsageExtension extends Extension {
  extension?: Extension[];
}

interface UsageData {
  sessionsUsed: number;
  sessionsLimit: number;
  isPro: boolean;
  lastResetDate: string;
}

export function useOrganizationUsage(organizationId: string) {
  const medplum = useMedplum();
  const [organization, setOrganization] = useState<Organization>();
  const [usageData, setUsageData] = useState<UsageData>({
    sessionsUsed: 0,
    sessionsLimit: FREE_SESSIONS_PER_MONTH,
    isPro: false,
    lastResetDate: new Date().toISOString()
  });

  const loadUsageData = async () => {
    if (!organizationId) return;

    const org = await medplum.readResource('Organization', organizationId);
    setOrganization(org);

    const usage = org.extension?.find((e: Extension) => e.url === USAGE_EXTENSION_URL) as UsageExtension;
    const isPro = !!org.extension?.find(e => 
      e.url === 'http://example.com/fhir/StructureDefinition/subscription-status' && 
      e.valueString === 'active'
    );

    if (usage) {
      const lastResetDate = new Date(usage.extension?.find((e: Extension) => e.url === 'lastResetDate')?.valueDateTime || '');
      const currentDate = new Date();
      
      if (lastResetDate.getMonth() !== currentDate.getMonth() || 
          lastResetDate.getFullYear() !== currentDate.getFullYear()) {
        setUsageData({
          sessionsUsed: 0,
          sessionsLimit: FREE_SESSIONS_PER_MONTH,
          isPro,
          lastResetDate: currentDate.toISOString()
        });
        await updateUsage(0, currentDate.toISOString());
      } else {
        setUsageData({
          sessionsUsed: usage.extension?.find((e: Extension) => e.url === 'sessionsUsed')?.valueInteger || 0,
          sessionsLimit: FREE_SESSIONS_PER_MONTH,
          isPro,
          lastResetDate: usage.extension?.find((e: Extension) => e.url === 'lastResetDate')?.valueDateTime || ''
        });
      }
    }
  };

  const updateUsage = async (newCount: number, resetDate: string) => {
    if (!organization) return;

    const updatedOrg = {
      ...organization,
      extension: [
        ...(organization.extension || []).filter((e: Extension) => 
          e.url !== USAGE_EXTENSION_URL
        ),
        {
          url: USAGE_EXTENSION_URL,
          extension: [
            {
              url: 'sessionsUsed',
              valueInteger: newCount
            },
            {
              url: 'lastResetDate',
              valueDateTime: resetDate
            }
          ]
        } as UsageExtension
      ]
    };

    await medplum.updateResource(updatedOrg);
    setOrganization(updatedOrg);
    await loadUsageData();
  };

  const incrementUsage = async () => {
    const newCount = usageData.sessionsUsed + 1;
    await updateUsage(newCount, usageData.lastResetDate);
  };

  useEffect(() => {
    loadUsageData();
  }, [organizationId]);

  return {
    usageData,
    incrementUsage,
    canUseSession: usageData.isPro || usageData.sessionsUsed < usageData.sessionsLimit
  };
} 