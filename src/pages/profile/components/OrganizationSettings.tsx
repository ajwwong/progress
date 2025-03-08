import { Stack, TextInput, Title, Text, Button, Group, Alert } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useState, useEffect } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconCircleCheck, IconCircleOff, IconAlertCircle } from '@tabler/icons-react';
import { normalizeErrorString } from '@medplum/core';
import { Organization, Practitioner } from '@medplum/fhirtypes';

export function OrganizationSettings(): JSX.Element {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Practitioner;
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<Organization | undefined>();
  const [organizationName, setOrganizationName] = useState('');
  const [canEdit, setCanEdit] = useState(false);

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

      await medplum.updateResource(updatedOrg);

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
      )}
    </Stack>
  );
}
