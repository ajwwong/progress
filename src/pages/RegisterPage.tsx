import { BackgroundImage, Box, Container, SimpleGrid, Stack, Text, List, Paper, Title, ThemeIcon, Timeline } from '@mantine/core';
import { RegisterForm, useMedplumProfile } from '@medplum/react';
import { CustomRegisterForm } from '../components/auth/CustomRegisterForm';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { MEDPLUM_PROJECT_ID, MEDPLUM_RECAPTCHA_SITE_KEY } from '../config';
import { IconUser, IconBuildingHospital, IconArrowRight } from '@tabler/icons-react';
import { useOnboarding } from '../hooks/useOnboarding';
import { OnboardingStep } from '../hooks/onboardingSteps';

export function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const profile = useMedplumProfile();
  const { setCurrentStep } = useOnboarding();

  {/*useEffect(() => {
    if (profile) {
      navigate('/calendar');
    }
  }, [profile, navigate]);
*/}
  const handleRegistrationSuccess = () => {
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
            Create Test Patient Account
          </Title>
          <Text c="dimmed" mt="md" size="xl">
            Step 1 of 2 in setting up your practice
          </Text>
        </Box>

        <Paper withBorder p="xl" radius="md">
          <Timeline active={0} bulletSize={32} lineWidth={2}>
            <Timeline.Item 
              bullet={<IconUser size={16} />} 
              title="Step 1: Create Test Patient Account"
            >
              <Text color="dimmed" size="sm">
                First, create a test patient account to:
              </Text>
              <List
                spacing="xs"
                size="sm"
                center
                mt={10}
              >
                <List.Item>Experience the patient portal firsthand</List.Item>
                <List.Item>Test features from a patient's perspective</List.Item>
                <List.Item>Better understand the client experience</List.Item>
              </List>
            </Timeline.Item>

            <Timeline.Item 
              bullet={<IconBuildingHospital size={16} />} 
              title="Step 2: Create Practice Account"
            >
              <Text color="dimmed" size="sm">
                Next, you'll set up your practice account to:
              </Text>
              <List
                spacing="xs"
                size="sm"
                center
                mt={10}
              >
                <List.Item>Access practice management features</List.Item>
                <List.Item>Manage patient records and appointments</List.Item>
                <List.Item>Configure your practice settings</List.Item>
              </List>
            </Timeline.Item>
          </Timeline>
        </Paper>

        <Container size="sm" px={0}>
          <Paper withBorder p="xl" radius="md">
            <CustomRegisterForm
              type="patient"
              projectId={MEDPLUM_PROJECT_ID}
              recaptchaSiteKey={MEDPLUM_RECAPTCHA_SITE_KEY}
              onSuccess={handleRegistrationSuccess}
            />
          </Paper>
        </Container>
      </Stack>
    </Container>
  );
}

export default RegisterPage;


