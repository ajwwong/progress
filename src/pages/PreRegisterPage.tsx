import { Container, Title, Text, List, ThemeIcon, Box, Paper, Stack, Group, Button, Timeline, Badge, SimpleGrid, Image, Accordion, Grid } from '@mantine/core';
import { IconBrain, IconClock, IconNotes, IconRobot, IconArrowRight, IconChartBar, IconHeartHandshake, IconCheck, IconShield, IconDeviceLaptop } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { Document, useMedplumProfile } from '@medplum/react';
import { useEffect, useState } from 'react';
import { MEDPLUM_PROJECT_ID, MEDPLUM_RECAPTCHA_SITE_KEY } from '../config';
import { CustomRegisterForm } from '../components/auth/CustomRegisterForm';
import { OperationOutcome } from '@medplum/fhirtypes';

export function PreRegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const profile = useMedplumProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [buttonClicked, setButtonClicked] = useState(false);

  useEffect(() => {
    if (profile) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const handleRegistrationSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <Container size="xl" my={40}>
      <Stack gap="xl">
        <Box ta="center" mb={40}>
          <Badge variant="filled" color="blue" size="lg" mb="md">
            AI-Enhanced Mini-EHR for Mental Health
          </Badge>
          <Title
            order={1}
            styles={(theme) => ({
              root: {
                fontFamily: theme.fontFamily,
                fontWeight: 800,
                fontSize: 48,
                lineHeight: 1.2,
                marginBottom: theme.spacing.md
              }
            })}
          >
            More Time for Care,{'\n'}
            Less Time on Paperwork
          </Title>
          <Text c="dimmed" size="xl" maw={600} mx="auto" mt="xl">
            Your all-in-one practice solution combining AI-powered documentation, 
            scheduling, and practice management - designed specifically for mental health professionals
          </Text>
          
          <Group mt={40} justify="center" gap="xl">
            <Button
              size="xl"
              radius="md"
              loading={buttonClicked}
              rightSection={!buttonClicked && <IconArrowRight size={20} />}
              styles={(theme) => ({
                root: {
                  backgroundColor: theme.colors.blue[6],
                  '&:hover': {
                    backgroundColor: theme.colors.blue[7],
                  },
                },
              })}
              onClick={() => {
                setButtonClicked(true);
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }}
            >
              {buttonClicked ? 'Setting up your account...' : 'Sign Up for Free'}
            </Button>
            <Button 
              variant="light"
              size="xl"
              radius="md"
              onClick={() => window.open('https://calendly.com/somatopia/coffee-chat-45', '_blank')}
            >
              Schedule Demo
            </Button>
          </Group>
        </Box>

        <Paper withBorder p="md" radius="md" bg="gray.0">
          <Group justify="center" gap="xl">
            <Text size="sm" c="dimmed">Built by a therapist, for therapists</Text>
            <Text size="sm" c="dimmed">Engineered for Mental Health</Text>
            <Text size="sm" c="dimmed">Secure and Private</Text>
          </Group>
        </Paper>

        <SimpleGrid cols={3} spacing="xl">
          <Paper withBorder p="xl" radius="md">
            <ThemeIcon size={48} radius="md" variant="light" color="blue" mb="md">
              <IconBrain size={24} />
            </ThemeIcon>
            <Title order={3} mb="sm">AI-Powered Notes</Title>
            <Text size="sm" c="dimmed">
              Smart templates and clinical insights help you create comprehensive, 
              compliant documentation in minutes
            </Text>
          </Paper>

          <Paper withBorder p="xl" radius="md">
            <ThemeIcon size={48} radius="md" variant="light" color="blue" mb="md">
              <IconClock size={24} />
            </ThemeIcon>
            <Title order={3} mb="sm">Save 6+ Hours Weekly</Title>
            <Text size="sm" c="dimmed">
              Spend more time with clients and less time on paperwork with 
              automated note generation
            </Text>
          </Paper>

          <Paper withBorder p="xl" radius="md">
            <ThemeIcon size={48} radius="md" variant="light" color="blue" mb="md">
              <IconChartBar size={24} />
            </ThemeIcon>
            <Title order={3} mb="sm">Practice Insights</Title>
            <Text size="sm" c="dimmed">
              Get valuable analytics and trends to improve care quality and 
              practice efficiency
            </Text>
          </Paper>
        </SimpleGrid>

        <Paper withBorder p="xl" radius="md">
          <Grid>
            <Grid.Col span={6}>
              <Stack gap="lg">
                <Title order={2}>Your Complete Practice Solution</Title>
                <List
                  spacing="md"
                  size="lg"
                  icon={
                    <ThemeIcon color="blue" size={24} radius="xl">
                      <IconCheck size={16} />
                    </ThemeIcon>
                  }
                >
                  <List.Item>Smart progress notes with AI assistance</List.Item>
                  <List.Item>Built-in scheduling and client management</List.Item>
                  <List.Item>Secure telehealth integration</List.Item>
                  <List.Item>Custom templates and workflows</List.Item>
                  <List.Item>Practice analytics and insights</List.Item>
                </List>
              </Stack>
            </Grid.Col>
            <Grid.Col span={6}>
              {/* Add screenshot or illustration */}
            </Grid.Col>
          </Grid>
        </Paper>

        <Paper withBorder p="xl" radius="md">
          <Title order={2} ta="center" mb="xl">What Clinicians Are Saying</Title>
          <SimpleGrid cols={3} spacing="xl">
            <Paper withBorder p="lg" radius="md">
              <Stack gap="md">
                <Text size="lg" style={{ fontStyle: 'italic' }}>
                  "The AI assistance has transformed my note-writing process. What used to take 30 minutes now takes 5, 
                  and the quality is consistently high."
                </Text>
                <Group>
                  <Stack gap={0}>
                    <Text fw={500}>Dr. Sarah Chen</Text>
                    <Text size="sm" c="dimmed">Licensed Psychologist</Text>
                  </Stack>
                </Group>
              </Stack>
            </Paper>

            <Paper withBorder p="lg" radius="md">
              <Stack gap="md">
                <Text size="lg" style={{ fontStyle: 'italic' }}>
                  "As someone who dreaded documentation, this platform has been a game-changer. 
                  The templates are intuitive and the AI suggestions are remarkably accurate."
                </Text>
                <Group>
                  <Stack gap={0}>
                    <Text fw={500}>Michael Torres, LMFT</Text>
                    <Text size="sm" c="dimmed">Marriage & Family Therapist</Text>
                  </Stack>
                </Group>
              </Stack>
            </Paper>

            <Paper withBorder p="lg" radius="md">
              <Stack gap="md">
                <Text size="lg" style={{ fontStyle: 'italic' }}>
                  "Finally, a practice management solution that understands mental health workflows. 
                  The time saved on documentation means I can see more clients."
                </Text>
                <Group>
                  <Stack gap={0}>
                    <Text fw={500}>Rachel Williams, LCSW</Text>
                    <Text size="sm" c="dimmed">Clinical Social Worker</Text>
                  </Stack>
                </Group>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Paper>

        <Paper withBorder p="xl" radius="md" bg="blue.0">
          <Stack gap="lg">
            <Title order={2}>Enterprise-Grade Security</Title>
            <SimpleGrid cols={2} spacing="xl">
              <List
                spacing="md"
                icon={
                  <ThemeIcon color="blue" size={24} radius="xl">
                    <IconShield size={16} />
                  </ThemeIcon>
                }
              >
                <List.Item>FHIR Compatible</List.Item>
                <List.Item>End-to-end encryption</List.Item>
                <List.Item>Regular security audits</List.Item>
              </List>
            </SimpleGrid>
          </Stack>
        </Paper>

        <Stack gap="lg">
          <Title order={2}>Frequently Asked Questions</Title>
          <Accordion>
            <Accordion.Item value="ai-safety">
              <Accordion.Control>How does the AI ensure clinical accuracy?</Accordion.Control>
              <Accordion.Panel>
                Our AI is designed to assist, not replace clinical judgment. You maintain full control and review of all documentation. 
                The AI helps by automating repetitive tasks and offering suggestions based on your input, but the final content 
                and clinical accuracy always remains under your professional oversight.
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="hipaa">
              <Accordion.Control>Is the platform secure and private?</Accordion.Control>
              <Accordion.Panel>
                We maintain strict compliance with enterprise-grade security measures, 
                including end-to-end encryption, secure data storage, and regular security audits. 
                All data is stored in enterprise-grade secure facilities with appropriate end-to-end encryption both at rest and in transit.
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="trial">
              <Accordion.Control>What's included in the free trial?</Accordion.Control>
              <Accordion.Panel>
                The trial includes full access to all features including AI-powered documentation, 
                scheduling, and practice management. No credit card required to start, 
                and you can copy your data out, if you'd like, at any time.
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>

        <Paper withBorder p="xl" radius="md" bg="blue.0">
          <Stack gap="lg" align="center">
            <Title order={2}>Ready to Transform Your Practice?</Title>
            <Text size="lg" maw={600} ta="center">
              Join our growing community of mental health professionals who are spending more time with clients
              and less time on documentation.
            </Text>
            <CustomRegisterForm
              type="patient"
              projectId={MEDPLUM_PROJECT_ID}
              recaptchaSiteKey={MEDPLUM_RECAPTCHA_SITE_KEY}
              onSuccess={handleRegistrationSuccess}
              onLoading={setIsLoading}
            />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
