import { Container, Stack, Title, Text, Group, Image, SimpleGrid, Paper, ThemeIcon, List, Divider } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../hooks/useOnboarding';
import { OnboardingStep } from '../../hooks/onboardingSteps';
import { useEffect } from 'react';
import { OrganizationInvitePage } from './OrganizationInvitePage';
import { IconBrain, IconRocket, IconCheck, IconHeartHandshake } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import { Document } from '@medplum/react';

interface OrganizationInvitePageProps {
  onSuccess: () => Promise<void>;
}

export function OrganizationSetupPage(): JSX.Element {
  const navigate = useNavigate();
  const { updateOnboardingStep } = useOnboarding();

  useEffect(() => {
    const initStep = async () => {
      await updateOnboardingStep(OnboardingStep.REGISTERED);
    };
    initStep();
  }, [updateOnboardingStep]);

  const handleComplete = async () => {
    showNotification({
      title: '🎉 Welcome to Practice Harbor!',
      message: 'Your journey to better practice management starts now.',
      color: 'blue',
      autoClose: 5000
    });
    
    //await updateOnboardingStep(OnboardingStep.ORGANIZATION_CREATED);
    navigate('/onboarding/logoff');
  };

  return (
    <Document width={1000}>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <Group align="center" justify="center">
            <Image
              src="/droplet.png"
              alt="Practice Harbor Logo"
              w={125}
              h={125}
              mr={50}
            />
            <Stack gap={0}>
              <Title order={1} style={{ fontSize: '2.8rem', margin: 0, lineHeight: 1 }}>
                Progress Notes
              </Title>
              <Text size="xl" c="dimmed" style={{ lineHeight: 1.2 }}>
                Your Modern, AI-Enhanced Practice Management Life Saver
              </Text>
            </Stack>
          </Group>

          <Divider my="xl" />

          <Title order={2} ta="center" style={{ fontSize: '2.2rem' }}>
            Start Your Free Trial
          </Title>
          <Text size="xl" c="dimmed" ta="center">
            Built by therapists, for therapists who care
          </Text>

          <SimpleGrid cols={3} spacing={30}>
            <Paper shadow="md" radius="md" p={30} withBorder>
              <Stack gap="lg">
                <ThemeIcon size={56} radius="md" variant="light" color="violet">
                  <IconBrain size={28} />
                </ThemeIcon>
                <Title order={3}>AI-Powered Notes</Title>
                <Text size="lg">
                  Save 5+ hours weekly with intelligent documentation assistance and automated note-taking.
                </Text>
              </Stack>
            </Paper>

            <Paper shadow="md" radius="md" p={30} withBorder>
              <Stack gap="lg">
                <ThemeIcon size={56} radius="md" variant="light" color="blue">
                  <IconRocket size={28} />
                </ThemeIcon>
                <Title order={3}>Integrated Records</Title>
                <Text size="lg">
                  Built to make life easier. Notes drop straight into your records. Click less, get more done.
                </Text>
              </Stack>
            </Paper>

            <Paper shadow="md" radius="md" p={30} withBorder>
              <Stack gap="lg">
                <ThemeIcon size={56} radius="md" variant="light" color="green">
                  <IconHeartHandshake size={28} />
                </ThemeIcon>
                <Title order={3}>HIPAA Secure</Title>
                <Text size="lg">
                  Enterprise-grade security and compliance built-in. Your practice, protected.
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>

          <Container size="sm">
            <Paper shadow="md" radius="md" p={35} withBorder>
              <OrganizationInvitePage onSuccess={handleComplete} />
            </Paper>
          </Container>

          <Text c="dimmed" size="sm" ta="center">
            By signing up, you agree to our Terms of Service and Privacy Policy.
            Need help? <a href="mailto:support@practiceharbor.com">Contact our team</a>
          </Text>
        </Stack>
      </Container>
    </Document>
  );
}
