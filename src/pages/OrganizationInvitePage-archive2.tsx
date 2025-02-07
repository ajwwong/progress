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
    console.log('Form data collected:', {
      organization: formData.get('organization'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email')
    });
    
    try {
      console.log('Starting organization registration process...');
      console.log('Environment variables:', {
        projectId: import.meta.env.VITE_MEDPLUM_PROJECT_ID,
        baseUrl: import.meta.env.VITE_MEDPLUM_BASE_URL
      });
      
      // Start client login to get access token
      console.log('Attempting client login...');
      await registrationClient.startClientLogin();
      console.log('Client login successful');
      
      // Add after client login success
      console.log('Verifying access policy exists...');
      try {
        const accessPolicy = await registrationClient.readResource('AccessPolicy', import.meta.env.VITE_MEDPLUM_ACCESS_POLICY_ID || '69d2ae8e-82a6-443a-a741-fb6cecf4ed76');
        console.log('Access Policy exists:', accessPolicy);
      } catch (err) {
        console.error('Access policy not found:', err);
        console.error('Access policy error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
      }
      
      // Create organization using the registration client
      console.log('Creating organization with name:', formData.get('organization'));
      const organization = await registrationClient.createResource({
        resourceType: 'Organization',
        name: formData.get('organization')
      });
      console.log('Organization created successfully:', JSON.stringify(organization, null, 2));
      console.log('Organization ID:', organization.id);

      // Modify the invite request structure
      const inviteRequest = {
        resourceType: 'Practitioner',
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
       // sendEmail: true,
        // Use the top-level access property instead of nesting in membership
        access: [{
          policy: {
            reference: `AccessPolicy/${import.meta.env.VITE_MEDPLUM_ACCESS_POLICY_ID || '69d2ae8e-82a6-443a-a741-fb6cecf4ed76'}`
          },
          parameter: [{
            name: "current_organization",
            valueReference: {
              reference: `Organization/${organization.id}`
            }
          }]
        }]
      };

      // Add validation logging
      console.log('Access Policy Reference:', `AccessPolicy/${import.meta.env.VITE_MEDPLUM_ACCESS_POLICY_ID || '69d2ae8e-82a6-443a-a741-fb6cecf4ed76'}`);
      console.log('Organization Reference:', `Organization/${organization.id}`);
      console.log('Project Reference:', `Project/${import.meta.env.VITE_MEDPLUM_PROJECT_ID}`);

      // Invite user as practitioner
      try {
        const response = await registrationClient.post(
          `admin/projects/${import.meta.env.VITE_MEDPLUM_PROJECT_ID}/invite`, 
          inviteRequest
        );
        console.log('Invite request successful:', JSON.stringify(response, null, 2));
      } catch (error) {
        console.error('Invite request failed with error:', error);
        console.error('Detailed error information:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          stack: error.stack
        });
        throw error;
      }

      showNotification({
        title: 'Success',
        message: 'Organization registered successfully',
        color: 'green',
        icon: <IconCircleCheck />
      });
      
      navigate('/');
    } catch (err) {
      console.error('Registration process failed:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
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
