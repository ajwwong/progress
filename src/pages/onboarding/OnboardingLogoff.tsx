import { Box, Button, Container, Stack, Text, Title, Paper, Timeline, List, Group, ThemeIcon, Image } from '@mantine/core';
import { useNavigate, Link } from 'react-router-dom';
import { useOnboarding } from '../../hooks/useOnboarding';
import { OnboardingStep } from '../../hooks/onboardingSteps';
import { useEffect } from 'react';
import { OrganizationInvitePage } from './OrganizationInvitePage';
import { IconBuildingHospital, IconUser, IconArrowRight, IconCircleCheck, IconLogin } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import { Document, SignInForm, useMedplum } from '@medplum/react';
import { MantineTheme } from '@mantine/core';

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
      <Stack gap="xl">
        <Box ta="center" mb={30}>
          <Title
            order={1}
            style={(theme: MantineTheme) => ({
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
          <Stack gap="md">
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

  const handleSignInSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <Container size="md" my={40}>
      <Stack gap="xl">
        <Box ta="center" mb={30}>
          <Title
            order={1}
            style={{ fontSize: '2.8rem', margin: 0, lineHeight: 1 }}
          >
            Your Account Has Been Created!
          </Title>
          <Text c="dimmed" mt="md" size="xl">
            You're almost ready to start using Progress Notes
          </Text>
        </Box>

        <Paper shadow="md" radius="md" p={35} withBorder>
          <SignInForm
            onSuccess={handleSignInSuccess}
          >
            <Stack align="center" gap="xs">
              <Image
                src="/droplet.png"
                alt="Practice Harbor Logo"
                w={48}
                h={48}
                mx="auto"
                mb={8}
                style={{ width: 48, height: 48 }}
              />
              <Title
                ta="center"
                style={{ fontSize: '1.8rem', margin: 0, lineHeight: 1 }}
              >
                Sign in to Progress Notes
              </Title>
              <Text c="dimmed" size="sm" ta="center" mt={4}>
                Great to have you here.
              </Text>
            </Stack>
          </SignInForm>
        </Paper>
      </Stack>
    </Container>
  );
}
