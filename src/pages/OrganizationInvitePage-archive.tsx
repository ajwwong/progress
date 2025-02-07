import { Container, Stack, Title, TextInput, Button, Group, Paper, Text } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MedplumClient } from '@medplum/core';
import { showNotification } from '@mantine/notifications';
import { normalizeErrorString } from '@medplum/core';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';

// Create a separate client for registration with superadmin credentials
const registrationClient = new MedplumClient({
  baseUrl: import.meta.env.VITE_MEDPLUM_BASE_URL || 'http://localhost:8103',
  clientId: import.meta.env.VITE_MEDPLUM_SUPERADMIN_CLIENT_ID,
  clientSecret: import.meta.env.VITE_MEDPLUM_SUPERADMIN_CLIENT_SECRET
});

// Initialize client with Basic auth
registrationClient.setBasicAuth(
  import.meta.env.VITE_MEDPLUM_SUPERADMIN_CLIENT_ID,
  import.meta.env.VITE_MEDPLUM_SUPERADMIN_CLIENT_SECRET
);

export function OrganizationInvitePage(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      // Start client login to get access token
      await registrationClient.startClientLogin();
      
      // Create organization using the registration client
      const organization = await registrationClient.createResource({
        resourceType: 'Organization',
        name: formData.get('organization')
      });

      // Invite user as practitioner
      const response = await registrationClient.post(`admin/projects/${import.meta.env.VITE_MEDPLUM_PROJECT_ID}/invite`, {
        resourceType: 'Practitioner',
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        membership: {
          access: [{
            policy: {
              reference: "AccessPolicy/multi-tenant-org-policy"
            },
            parameter: [{
              name: "current_organization",
              valueReference: {
                reference: `Organization/${organization.id}`
              }
            }]
          }]
        }
      });

      showNotification({
        title: 'Success',
        message: 'Organization registered successfully',
        color: 'green',
        icon: <IconCircleCheck />
      });
      
      navigate('/registration-success');
    } catch (err) {
      showNotification({
        title: 'Error',
        message: normalizeErrorString(err),
        color: 'red',
        icon: <IconCircleOff />
      });
    }
    setLoading(false);
  };

  return (
    <Container size="sm" py="xl">
      <Paper withBorder p="xl">
        <form onSubmit={handleSubmit}>
          <Stack>
            <Title order={2}>Organization Registration</Title>
            <Text c="dimmed">Register a new organization and administrator</Text>

            <TextInput
              name="firstName"
              label="First Name"
              required
              autoFocus
            />

            <TextInput 
              name="lastName" 
              label="Last Name" 
              required 
            />

            <TextInput
              name="email"
              type="email"
              label="Email"
              required
            />

            <TextInput
              name="organization"
              label="Organization Name"
              required
            />

            <Group justify="flex-end">
              <Button 
                variant="subtle" 
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                loading={loading}
              >
                Register
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
