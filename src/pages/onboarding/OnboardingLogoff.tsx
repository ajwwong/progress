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
