import { Container, Stack, Title, TextInput, Button, Group, NativeSelect, Checkbox, Paper, Text } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { useState } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import { normalizeErrorString } from '@medplum/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { Practitioner } from '@medplum/fhirtypes';

export function InvitePage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const defaultRole = location.state?.defaultRole || 'Practitioner';
  const profile = medplum.getProfile() as Practitioner;
  
  // Get project ID from the profile's project membership
  const projectId = profile.meta?.project;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      if (!projectId) {
        throw new Error('Project ID not found');
      }

      await medplum.post(`admin/projects/${projectId}/invite`, {
        resourceType: formData.get('resourceType') as string,
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        email: formData.get('email') as string,
        sendEmail: formData.get('sendEmail') === 'on'
      });

      showNotification({
        title: 'Success',
        message: 'Invitation sent successfully',
        color: 'green',
        icon: <IconCircleCheck />
      });

      navigate(-1);
    } catch (error) {
      showNotification({
        title: 'Error',
        message: normalizeErrorString(error),
        color: 'red',
        icon: <IconCircleOff />
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Paper withBorder p="xl">
        <form onSubmit={handleSubmit}>
          <Stack>
            <Title order={2}>Invite New Member</Title>
            <Text c="dimmed">Send an invitation to join your practice</Text>

            <NativeSelect
              name="resourceType"
              label="Role"
              defaultValue={defaultRole}
              data={['Practitioner', 'Patient', 'RelatedPerson']}
              required
            />

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

            <Checkbox 
              name="sendEmail" 
              label="Send email invitation" 
              defaultChecked 
            />

            <Group justify="flex-end">
              <Button 
                variant="subtle" 
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                loading={loading}
              >
                Send Invitation
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
