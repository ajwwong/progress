import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Practitioner, Extension } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';

const FREE_SESSIONS_PER_MONTH = 10;
const USAGE_EXTENSION_URL = 'http://example.com/fhir/StructureDefinition/session-usage';
const PRO_SUBSCRIPTION_EXTENSION_URL = 'http://example.com/fhir/StructureDefinition/pro-subscription';

interface UsageExtension extends Extension {
  extension?: Extension[];
}

export interface UsageData {
  sessionsUsed: number;
  sessionsLimit: number;
  isPro: boolean;
  lastResetDate: string;
}

export function useProfileUsage() {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Practitioner;
  const [usageData, setUsageData] = useState<UsageData>({
    sessionsUsed: 0,
    sessionsLimit: FREE_SESSIONS_PER_MONTH,
    isPro: false,
    lastResetDate: new Date().toISOString()
  });

  const loadUsageData = async () => {
    if (!profile) return;

    const usage = profile.extension?.find((e: Extension) => e.url === USAGE_EXTENSION_URL) as UsageExtension;
    const proSubscription = profile.extension?.find((e: Extension) => e.url === PRO_SUBSCRIPTION_EXTENSION_URL);
    const isPro = proSubscription?.valueBoolean || false;

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
        await updateUsage(0, currentDate.toISOString(), isPro);
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

  const updateUsage = async (newCount: number, resetDate: string, isPro: boolean) => {
    if (!profile) return;

    const updatedProfile: Practitioner = {
      ...profile,
      extension: [
        ...(profile.extension || []).filter((e: Extension) => 
          e.url !== USAGE_EXTENSION_URL && e.url !== PRO_SUBSCRIPTION_EXTENSION_URL
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
        } as UsageExtension,
        {
          url: PRO_SUBSCRIPTION_EXTENSION_URL,
          valueBoolean: isPro
        }
      ]
    };

    await medplum.updateResource(updatedProfile);
    await loadUsageData();
  };

  const incrementUsage = async () => {
    const newCount = usageData.sessionsUsed + 1;
    await updateUsage(newCount, usageData.lastResetDate, usageData.isPro);
  };

  const upgradeToPro = async () => {
    await updateUsage(usageData.sessionsUsed, usageData.lastResetDate, true);
  };

  useEffect(() => {
    if (profile) {
      loadUsageData();
    }
  }, [profile]);

  return {
    usageData,
    incrementUsage,
    upgradeToPro,
    canUseSession: usageData.isPro || usageData.sessionsUsed < usageData.sessionsLimit
  };
} 