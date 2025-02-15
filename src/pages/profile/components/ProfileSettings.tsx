import { Stack, TextInput, Title, Text, Button, Group, Select } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { useState } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import { useProfileData } from '../hooks/useProfileData';
import { normalizeErrorString } from '@medplum/core';

export function ProfileSettings(): JSX.Element {
  const { 
    profile,
    profileLoading,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email
  } = useProfileData();
  const medplum = useMedplum();
  const [loading, setLoading] = useState(false);
  const [specialty, setSpecialty] = useState(profile?.qualification?.[0]?.code?.text || '');

  const handleProfileUpdate = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      await medplum.updateResource({
        ...profile,
        name: [{
          ...profile.name?.[0],
          given: [firstName],
          family: lastName
        }],
        telecom: [
          { system: 'email', value: email },
          ...(profile.telecom?.filter(t => t.system !== 'email') || [])
        ],
        qualification: [{
          code: {
            text: specialty
          }
        }]
      });

      showNotification({
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Profile updated successfully'
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
      <Group position="apart">
        <div>
          <Title order={2}>Profile Settings</Title>
          <Text c="dimmed">Manage your account information.</Text>
        </div>
      </Group>

      {profileLoading ? (
        <Text>Loading profile...</Text>
      ) : (
        <Group align="flex-start" gap="xl">
          <Stack style={{ flex: 1 }}>
            <TextInput
              label="Email"
              value={email}
              disabled
            />

            <TextInput
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
            />

            <TextInput
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter your last name"
            />

            <Select
              label="Specialty"
              placeholder="Select specialty"
              data={[
                'Psychotherapy',
                'Counseling',
                'Clinical Psychology',
                'Psychiatry',
                'Marriage and Family Therapy'
              ]}
              value={specialty}
              onChange={setSpecialty}
            />

            <Button color="blue" onClick={handleProfileUpdate} loading={loading}>
              Save Changes
            </Button>
          </Stack>
        </Group>
      )}
    </Stack>
  );
}
