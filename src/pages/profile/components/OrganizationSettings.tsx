import { Stack, TextInput, Title, Text, Button, Group, Alert, Divider, Card, Badge, Progress } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useState, useEffect, useMemo } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconCircleCheck, IconCircleOff, IconAlertCircle, IconChartBar } from '@tabler/icons-react';
import { normalizeErrorString } from '@medplum/core';
import { Organization, Practitioner } from '@medplum/fhirtypes';
import { ExtensionEditor } from './subscription/ExtensionEditor';
import { SessionUsageCard } from './subscription/SessionUsageCard';
import { STRIPE_CONFIG } from '../../../config/stripe-config';

// Replace the hardcoded SUBSCRIPTION_TIERS with a function
const getSubscriptionTiers = () => {
  const mode = import.meta.env.VITE_STRIPE_MODE as 'TEST' | 'PROD';
  const plans = STRIPE_CONFIG[mode].STANDARD.plans;
  
  const tiers: Record<string, { name: string; price: number }> = {
    'free': { name: 'Free Tier', price: 0 }
  };

  // Add all plans from stripe config
  Object.entries(plans).forEach(([_, plan]) => {
    tiers[plan.priceId] = {
      name: `${plan.sessions} Sessions`,
      price: plan.amount / 100 // Convert cents to dollars
    };
  });

  return tiers;
};

export function OrganizationSettings(): JSX.Element {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Practitioner;
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<Organization | undefined>();
  const [organizationName, setOrganizationName] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const subscriptionTiers = useMemo(() => getSubscriptionTiers(), []);

  useEffect(() => {
    const checkPermissionsAndFetchOrg = async () => {
      try {
        // First try to get organization from profile's meta.compartment
        const orgReference = profile.meta?.compartment?.find(
          c => c.reference?.startsWith('Organization/')
        )?.reference;

        if (!orgReference) {
          const membership = await medplum.getProfile();
          if (!membership) {
            throw new Error('No membership found');
          }
          
          const membershipOrgRef = membership.extension?.find(
            (p: { url: string }) => p.url === 'http://example.com/fhir/StructureDefinition/current-organization'
          )?.valueReference?.reference;

          if (!membershipOrgRef) {
            throw new Error('No organization reference found in profile or membership');
          }

          // Check if user has write access to the organization
          try {
            await medplum.search('Organization', {
              _id: membershipOrgRef.split('/')[1],
              _fields: 'id'
            });
            setCanEdit(true);
          } catch (err) {
            console.log('User does not have write access to organization');
            setCanEdit(false);
          }

          const org = await medplum.readReference<Organization>({ reference: membershipOrgRef });
          setOrganization(org);
          setOrganizationName(org.name || '');
        } else {
          // Similar check for compartment-based reference
          try {
            await medplum.search('Organization', {
              _id: orgReference.split('/')[1],
              _fields: 'id'
            });
            setCanEdit(true);
          } catch (err) {
            console.log('User does not have write access to organization');
            setCanEdit(false);
          }

          const org = await medplum.readReference<Organization>({ reference: orgReference });
          setOrganization(org);
          setOrganizationName(org.name || '');
        }
      } catch (err) {
        console.error('Error fetching organization:', err);
        showNotification({
          color: 'red',
          icon: <IconCircleOff />,
          title: 'Error',
          message: normalizeErrorString(err)
        });
      }
    };

    if (profile) {
      checkPermissionsAndFetchOrg();
    }
  }, [medplum, profile]);

  const handleOrganizationUpdate = async () => {
    if (!organization || !canEdit) return;
    
    setLoading(true);
    try {
      const updatedOrg: Organization = {
        ...organization,
        name: organizationName
      };

      const result = await medplum.updateResource(updatedOrg);
      setOrganization(result);

      showNotification({
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Organization updated successfully'
      });
    } catch (err) {
      showNotification({
        color: 'red',
        icon: <IconCircleOff />,
        title: 'Error',
        message: normalizeErrorString(err)
      });
    }
    setLoading(false);
  };

  const handleExtensionSave = async (updatedOrg: Organization) => {
    try {
      const result = await medplum.updateResource(updatedOrg);
      setOrganization(result);
      showNotification({
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Subscription details updated successfully'
      });
    } catch (err) {
      showNotification({
        color: 'red',
        icon: <IconCircleOff />,
        title: 'Error',
        message: normalizeErrorString(err)
      });
    }
  };

  // Helper function to get plan details
  const getPlanDetails = (organization: Organization) => {
    const planId = organization.extension?.find(
      e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-plan'
    )?.valueString || 'free';

    const status = organization.extension?.find(
      e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-status'
    )?.valueString;

    const sessionsUsed = organization.extension?.find(
      e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-sessions-used'
    )?.valueInteger || 0;

    const sessionsLimit = organization.extension?.find(
      e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-sessions-allowed'
    )?.valueInteger || 10;

    const lastReset = organization.extension?.find(
      e => e.url === 'http://example.com/fhir/StructureDefinition/session-last-reset'
    )?.valueDateTime;

    return {
      plan: subscriptionTiers[planId as keyof typeof subscriptionTiers] || subscriptionTiers.free,
      status,
      sessionsUsed,
      sessionsLimit,
      lastReset
    };
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>Organization Settings</Title>
          <Text c="dimmed">Manage your organization information.</Text>
        </div>
      </Group>

      {!organization ? (
        <Text>Loading organization...</Text>
      ) : (
        <Stack gap="xl">
          <Group align="flex-start" gap="xl">
            <Stack style={{ flex: 1 }}>
              {!canEdit && (
                <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                  You do not have permission to edit organization settings. Please contact your administrator.
                </Alert>
              )}
              
              <TextInput
                label="Organization Name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Enter organization name"
                disabled={!canEdit}
              />

              <Button 
                color="blue" 
                onClick={handleOrganizationUpdate} 
                loading={loading}
                disabled={!canEdit}
              >
                Save Changes
              </Button>
            </Stack>
          </Group>

          <Divider my="lg" />

          {canEdit && (
            <>
              <Card withBorder>
                <Stack>
                  <Group justify="space-between">
                    <Title order={3}>Usage Overview</Title>
                    {organization && (
                      <Badge 
                        color={getPlanDetails(organization).status === 'active' ? 'green' : 'blue'}
                        size="lg"
                      >
                        {getPlanDetails(organization).plan.name}
                      </Badge>
                    )}
                  </Group>
                  <SessionUsageCard organization={organization} />
                </Stack>
              </Card>

              <ExtensionEditor 
                organization={organization} 
                onSave={handleExtensionSave} 
              />
            </>
          )}
        </Stack>
      )}
    </Stack>
  );
}
