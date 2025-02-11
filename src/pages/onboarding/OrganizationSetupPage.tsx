import { Box, Button, Container, Stack, Text, Title, Paper, Timeline, List, Group, ThemeIcon } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../hooks/useOnboarding';
import { OnboardingStep } from '../../hooks/onboardingSteps';
import { useEffect } from 'react';
import { OrganizationInvitePage } from './OrganizationInvitePage';
import { IconBuildingHospital, IconUser, IconArrowRight, IconCircleCheck } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';

export function OrganizationSetupPage(): JSX.Element {
  const navigate = useNavigate();
  const { updateOnboardingStep } = useOnboarding();

  useEffect(() => {
    updateOnboardingStep(OnboardingStep.REGISTERED);
  }, [updateOnboardingStep]);

  const handleComplete = async () => {
    showNotification({
      title: '🎉 Organization Setup Complete!',
      message: 'Great job! Your organization is now set up.',
      color: 'green',
      autoClose: 5000
    });
    
    await updateOnboardingStep(OnboardingStep.ORGANIZATION_CREATED);
    navigate('/onboarding/logoff');
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
