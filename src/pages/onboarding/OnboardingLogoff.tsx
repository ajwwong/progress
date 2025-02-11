import { Box, Button, Container, Stack, Text, Title, Paper, Timeline, List, Group, ThemeIcon } from '@mantine/core';
import { useNavigate, Link } from 'react-router-dom';
import { useOnboarding } from '../../hooks/useOnboarding';
import { OnboardingStep } from '../../hooks/onboardingSteps';
import { useEffect } from 'react';
import { OrganizationInvitePage } from './OrganizationInvitePage';
import { IconBuildingHospital, IconUser, IconArrowRight, IconCircleCheck, IconLogin } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import { useMedplum } from '@medplum/react';

export function OrganizationSetupPage(): JSX.Element {
  const navigate = useNavigate();
  const { updateOnboardingStep } = useOnboarding();

  useEffect(() => {
    updateOnboardingStep(OnboardingStep.REGISTERED);
  }, [updateOnboardingStep]);

  const handleComplete = async () => {
    showNotification({
      title: '🎉 Organization Setup Complete!',
      message: 'Great job! Your organization is now set up. Next, we\'ll guide you through a quick tutorial of our transcription feature.',
      color: 'green',
      autoClose: 5000
    });
    
    await updateOnboardingStep(OnboardingStep.ORGANIZATION_SETUP);
    navigate('/dashboard');
  };

  return (
    <Container size="md" my={40}>
      <Stack spacing="xl">
        <Box ta="center" mb={30}>
          <Title
            order={1}
            sx={(theme) => ({
              fontFamily: `Greycliff CF, ${theme.fontFamily}`,
              fontWeight: 900,
              fontSize: 44,
            })}
          >
            Organization Setup
          </Title>
          <Text c="dimmed" mt="md" size="xl">
            Step 2 of 2 in setting up your practice
          </Text>
        </Box>

        <Paper withBorder p="xl" radius="md" bg="green.0">
          <Stack spacing="md">
            <Group>
              <ThemeIcon size="xl" radius="xl" color="green" variant="light">
                <IconCircleCheck size={24} />
              </ThemeIcon>
              <Title order={3}>Test Patient Account Created Successfully!</Title>
            </Group>
            
            <Text size="md">
              Great job! You've successfully created your test patient account. This account will eventually 
              allow you to experience the patient portal firsthand, helping you better understand your clients' experience.
            </Text>
            
            <Text size="md" mt="xs">
              <b>Next Step:</b> Let's set up your actual practice account below, which will give you access to all the 
              practice management features you need to run your business efficiently.
            </Text>
          </Stack>
        </Paper>

        <Container size="sm" px={0}>
          <Paper withBorder p="xl" radius="md">
            <OrganizationInvitePage 
              onSuccess={handleComplete}
            />
          </Paper>
        </Container>
      </Stack>
    </Container>
  );
}

export function OnboardingLogoff(): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();

  const handleSignOut = async () => {
    try {
      showNotification({
        title: 'Signing out...',
        message: 'Please wait while we prepare for your practice account login.',
        color: 'blue',
        loading: true,
        autoClose: 2000,
      });

      await medplum.signOut();
      
      // Short delay to ensure signOut completes and notification is seen
      setTimeout(() => {
        navigate('/signin');
      }, 2000);
      
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to sign out. Please try again.',
        color: 'red',
      });
    }
  };

  return (
    <Container size="md" my={40}>
      <Stack spacing="xl">
        <Box ta="center" mb={30}>
          <Title
            order={1}
            sx={(theme) => ({
              fontFamily: `Greycliff CF, ${theme.fontFamily}`,
              fontWeight: 900,
              fontSize: 44,
            })}
          >
            Practice Account Created!
          </Title>
          <Text c="dimmed" mt="md" size="xl">
            You're almost ready to start using Practice Harbor
          </Text>
        </Box>

        <Paper withBorder p="xl" radius="md" bg="green.0">
          <Stack spacing="md">
            <Group>
              <ThemeIcon size="xl" radius="xl" color="green" variant="light">
                <IconCircleCheck size={24} />
              </ThemeIcon>
              <Title order={3}>Real Practice Account Created Successfully!</Title>
            </Group>
            
            <Text size="md">
              Congratulations! You've successfully created your practice account. This is the account you'll 
              use to manage your practice, handle appointments, and access all provider features.
            </Text>
            
            <Text size="md" mt="xs">
              <b>Next Step:</b> To ensure everything is set up correctly and to access your practice dashboard, 
              you'll need to sign in with your new practice account credentials.
            </Text>

            <Paper withBorder p="md" radius="md" bg="blue.0" mt="md">
              <Group>
                <ThemeIcon size="lg" radius="xl" color="blue" variant="light">
                  <IconLogin size={20} />
                </ThemeIcon>
                <Text size="sm" fw={500}>
                  Important: You'll be signing in with your practice email and password, not your test patient account.
                </Text>
              </Group>
            </Paper>

            <Group mt="xl">
              <Button 
                onClick={handleSignOut}
                size="lg" 
                rightSection={<IconArrowRight size={20} />}
                color="green"
              >
                Sign In to Practice Account
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
