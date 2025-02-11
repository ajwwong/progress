import { Container, Stack, Title, TextInput, Button, Group, Paper, Text } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MedplumClient } from '@medplum/core';
import { showNotification } from '@mantine/notifications';
import { normalizeErrorString } from '@medplum/core';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { OnboardingStep } from '../../hooks/onboardingSteps';

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
  const { updateOnboardingStep } = useOnboarding();
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    
    // Add password field to the form data
    const password = formData.get('password'); // Add password field to your form
    
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
        name: formData.get('organization'),
        meta: {
          project: import.meta.env.VITE_MEDPLUM_PROJECT_ID,
          compartment: [{
            reference: `Project/${import.meta.env.VITE_MEDPLUM_PROJECT_ID}`
          }]
        }
      });
      console.log('Organization created successfully:', JSON.stringify(organization, null, 2));
      console.log('Organization ID:', organization.id);

      // Modified invite request to include organization reference
      const inviteRequest = {
        resourceType: 'Practitioner',
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: password,
        sendEmail: false,
        membership: {  // Wrap access in membership
          access: [{
            policy: {
              reference: `AccessPolicy/${import.meta.env.VITE_MEDPLUM_ACCESS_POLICY_ID}`
            },
            parameter: [{
              name: "current_organization",
              valueReference: {
                reference: `Organization/${organization.id}`
              }
            }]
          }]
        }
      };

      // Add validation logging
      console.log('Access Policy Reference:', `AccessPolicy/${import.meta.env.VITE_MEDPLUM_ACCESS_POLICY_ID || '69d2ae8e-82a6-443a-a741-fb6cecf4ed76'}`);
      console.log('Organization Reference:', `Organization/${organization.id}`);
      console.log('Project Reference:', `Project/${import.meta.env.VITE_MEDPLUM_PROJECT_ID}`);

      // Invite user as practitioner
      const inviteResponse = await registrationClient.post(
        `admin/projects/${import.meta.env.VITE_MEDPLUM_PROJECT_ID}/invite`, 
        inviteRequest
      );
      console.log('Invite response:', JSON.stringify(inviteResponse, null, 2));

      // Update the practitioner with organization reference
      try {
        // Extract practitioner ID from the ProjectMembership response
        const practitionerId = inviteResponse.profile.reference.split('/')[1];
        
        // First get the existing practitioner
        const existingPractitioner = await registrationClient.readResource('Practitioner', practitionerId);
        
        // Then update with all existing fields plus new compartment
        const practitioner = await registrationClient.updateResource({
          ...existingPractitioner,
          meta: {
            ...existingPractitioner.meta,
            compartment: [
              ...(existingPractitioner.meta?.compartment || []),
              {
                reference: `Organization/${organization.id}`
              }
            ]
          }
        });
        console.log('Updated practitioner with organization compartment:', practitioner);
      } catch (error) {
        console.error('Error updating practitioner:', error);
        throw error;
      }

      // The invite response includes a passwordResetUrl that contains the id/secret
      const passwordResetUrl = inviteResponse.passwordResetUrl;
      if (passwordResetUrl) {
        const paths = passwordResetUrl.split('/');
        const id = paths[paths.length - 2];
        const secret = paths[paths.length - 1];

        // Store in Communication
        await registrationClient.createResource({
          resourceType: 'Communication',
          status: 'completed',
          subject: {
            reference: inviteResponse.profile.reference
          },
          category: [{
            coding: [{
              system: 'http://terminology.medplum.org/communication-categories',
              code: 'welcome-email-security'
            }]
          }],
          payload: [{
            contentString: JSON.stringify({
              id,
              secret,
              userReference: inviteResponse.user.reference
            })
          }]
        });
        console.log('Security info stored in Communication resource');
      }

      // Check user reference
      const userRef = inviteResponse.user?.reference;
      console.log('User reference:', userRef);

      // Search for security request
      try {
        const securityRequest = await registrationClient.searchOne('UserSecurityRequest', {
          user: `User/${inviteResponse.user.reference.split('/')[1]}`,
          _sort: '-_lastUpdated'
        });
        
        console.log('Security Request search result:', JSON.stringify(securityRequest, null, 2));
        
        if (securityRequest) {
          console.log('Security Request found:', JSON.stringify(securityRequest, null, 2));
          
          // Store the security info in a Communication resource
          await registrationClient.createResource({
            resourceType: 'Communication',
            status: 'completed',
            subject: {
              reference: inviteResponse.profile.reference
            },
            category: [{
              coding: [{
                system: 'http://terminology.medplum.org/communication-categories',
                code: 'welcome-email-security'
              }]
            }],
            payload: [{
              contentString: JSON.stringify({
                id: securityRequest.id,
                secret: securityRequest.secret,
                userReference: securityRequest.user.reference
              })
            }]
          });
          console.log('Security info stored in Communication resource');
        } else {
          console.error('No UserSecurityRequest found - search returned null');
        }
      } catch (error) {
        console.error('Error searching for UserSecurityRequest:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
      }

      await updateOnboardingStep(OnboardingStep.ORGANIZATION_CREATED);

      showNotification({
        title: 'Success',
        message: 'Organization registered successfully',
        color: 'green',
        icon: <IconCircleCheck />
      });
      
      navigate('/onboarding/logoff');
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

            <TextInput
              name="password"
              type="password"
              label="Password"
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
