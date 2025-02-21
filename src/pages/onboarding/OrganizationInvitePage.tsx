import { Container, Stack, Title, TextInput, Button, Group, Paper, Text, PasswordInput } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MedplumClient } from '@medplum/core';
import { showNotification } from '@mantine/notifications';
import { normalizeErrorString } from '@medplum/core';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { OnboardingStep } from '../../hooks/onboardingSteps';
import { useMedplum } from '@medplum/react';

//const ORGANIZATION_REGISTRATION_BOT_ID = '2d870407-8e34-4ff9-b1f1-a499819bfe5e';
const ORGANIZATION_REGISTRATION_BOT_ID = '01952512-3a8f-7567-93d0-0db6c29bb5f3';
export function OrganizationInvitePage(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();
  const { updateOnboardingStep } = useOnboarding();
  const medplum = useMedplum();
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordError('');
    setLoading(true);
    
    try {
      // Execute the bot using the existing medplum client
      const botResponse = await medplum.executeBot(
        ORGANIZATION_REGISTRATION_BOT_ID,
        {
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          email: formData.get('email'),
          organization: formData.get('organization'),
          password: password
        }
      );

      if (!botResponse.success) {
        throw new Error('Organization registration failed');
      }

      await updateOnboardingStep(OnboardingStep.ORGANIZATION_CREATED);

      showNotification({
        title: 'Success',
        message: 'Organization registered successfully',
        color: 'green',
        icon: <IconCircleCheck />,
        autoClose: 2000,
      });

      // Sign out with notification
      showNotification({
        title: 'Signing out...',
        message: 'Please wait while we prepare for your practice account login.',
        color: 'blue',
        loading: true,
        autoClose: 2000,
      });

      await medplum.signOut();
      
      // Short delay to ensure notifications are seen
      setTimeout(() => {
        navigate('/onboarding/logoff');
      }, 2000);

    } catch (err) {
      console.error('Registration process failed:', err);
      
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
      
        <form onSubmit={handleSubmit}>
          <Stack>
            <Title order={2}>Sign up for your free trial</Title>
            <Text c="dimmed">Register your practice to get started</Text>

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
              label="Name of your organization or practice"
              required
            />

            <PasswordInput
              name="password"
              label="Password"
              required
              description="Must be at least 8 characters long"
            />

            <PasswordInput
              name="confirmPassword"
              label="Confirm Password"
              required
              error={passwordError}
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
     
    </Container>
  );
}
