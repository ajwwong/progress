import { Container, Stack, Title, TextInput, Button, Group, NativeSelect, Checkbox, Paper, Text } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { useState } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import { normalizeErrorString } from '@medplum/core';
import { ProjectMembership } from '@medplum/fhirtypes';
import { useNavigate } from 'react-router-dom';

export function InvitePage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProjectMembership | undefined>();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await medplum.post('admin/invite', {
        resourceType: formData.get('resourceType'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        sendEmail: formData.get('sendEmail') === 'on',
        admin: formData.get('isAdmin') === 'on'
      });

      setResult(response);
      showNotification({
        title: 'Success',
        message: 'Invitation sent successfully',
        color: 'green',
        icon: <IconCircleCheck />
      });
      
      navigate('/settings');
    } catch (err) {
      showNotification({
        title: 'Error',
        message: normalizeErrorString(err),
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
              defaultValue="Practitioner"
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

            <Checkbox 
              name="isAdmin" 
              label="Grant admin privileges" 
            />

            <Group justify="flex-end">
              <Button 
                variant="subtle" 
                onClick={() => navigate('/settings')}
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
