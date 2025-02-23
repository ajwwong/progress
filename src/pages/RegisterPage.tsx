import { Container, Stack, Title, Text, Group, Image, SimpleGrid, Paper, ThemeIcon, List, Button, Divider } from '@mantine/core';
import { IconBrain, IconCheck, IconHeartHandshake } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { Document, useMedplumProfile } from '@medplum/react';
import { useEffect } from 'react';
import { MEDPLUM_PROJECT_ID, MEDPLUM_RECAPTCHA_SITE_KEY } from '../config';
import { CustomRegisterForm } from '../components/auth/CustomRegisterForm';
import { useOnboarding } from '../hooks/useOnboarding';

export function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const profile = useMedplumProfile();
  const { currentStep, setCurrentStep } = useOnboarding();

  useEffect(() => {
    if (profile) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const handleRegistrationSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <Document width={1000}>
      <Stack gap="xl">
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
              <Stack gap="md">
                <Title order={1} style={{ fontSize: '2.8rem', margin: 0, lineHeight: 1 }}>
                  Progress Notes
                </Title>
                <Text size="xl" c="dimmed" style={{ lineHeight: 1.2 }}>
                  Your Modern, AI-Enhanced Practice Management Life Saver
                </Text>
              </Stack>
            </Group>

            <Divider my="xl" />

            <SimpleGrid cols={2} gap={50}>
              <Paper shadow="md" radius="md" p={35} withBorder>
                <Stack gap="lg">
                  <ThemeIcon size={56} radius="md" variant="light" color="blue">
                    <IconBrain size={28} />
                  </ThemeIcon>
                  <Title order={3}>For Mental Health Providers</Title>
                  <List 
                    size="lg" 
                    center 
                    styles={{
                      item: {
                        marginBottom: '1rem'
                      }
                    }}
                    icon={
                      <ThemeIcon color="blue" size={28} radius="xl">
                        <IconCheck size={18} />
                      </ThemeIcon>
                    }
                  >
                    <List.Item>AI-Powered Clinical Documentation</List.Item>
                    <List.Item>Smart Voice-to-Text Transcription</List.Item>
                    <List.Item>Intelligent Scheduling System</List.Item>
                    <List.Item>Integrated Progress Notes</List.Item>
                  </List>
                </Stack>
              </Paper>

              <Paper shadow="md" radius="md" p={35} withBorder>
                <Stack gap="lg">
                  <ThemeIcon size={56} radius="md" variant="light" color="green">
                    <IconHeartHandshake size={28} />
                  </ThemeIcon>
                  <Title order={3}>Get Started Now</Title>
                  <Text size="lg">
                    Join the future of mental health practice management. Create your therapist account today and focus more on what matters - helping your clients thrive.
                  </Text>
                  <Group mt="auto" grow>
                    <CustomRegisterForm
                      type="patient"
                      projectId={MEDPLUM_PROJECT_ID}
                      recaptchaSiteKey={MEDPLUM_RECAPTCHA_SITE_KEY}
                      onSuccess={handleRegistrationSuccess}
                    />
                    <Button 
                      component={Link} 
                      to="/signin" 
                      size="lg" 
                      radius="md" 
                      variant="light"
                    >
                      Sign In
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </SimpleGrid>
          </Stack>
        </Container>
      </Stack>
    </Document>
  );
}

export default RegisterPage;


