import { Container, Title, Text, List, ThemeIcon, Box, Paper, Stack, Group, Button, Timeline, Badge, SimpleGrid, Image, Accordion, Grid } from '@mantine/core';
import { IconBrain, IconClock, IconNotes, IconRobot, IconArrowRight, IconChartBar, IconHeartHandshake, IconCheck, IconShield, IconDeviceLaptop } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export function PreRegisterPage(): JSX.Element {
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
          
          <Group justify="center" mt={40}>
            <Button 
              component={Link}
              to="/register"
              size="xl"
              rightSection={<IconArrowRight />}
            >
              Try Free for 30 Days
            </Button>
            <Button 
              variant="light"
              size="xl"
            >
              Schedule Demo
            </Button>
          </Group>
        </Box>

        <Paper withBorder p="md" radius="md" bg="gray.0">
          <Group justify="center" gap="xl">
            <Text size="sm" c="dimmed">Built by a therapist, for therapists</Text>
            <Text size="sm" c="dimmed">HIPAA Compliant</Text>
            <Text size="sm" c="dimmed">FHIR Compatible</Text>
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
            {/* Add testimonial cards */}
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
                <List.Item>HIPAA compliant infrastructure</List.Item>
                <List.Item>End-to-end encryption</List.Item>
                <List.Item>Regular security audits</List.Item>
              </List>
            </SimpleGrid>
          </Stack>
        </Paper>

        <Stack gap="lg">
          <Title order={2}>Frequently Asked Questions</Title>
          <Accordion>
            {/* Add FAQ items */}
          </Accordion>
        </Stack>

        <Paper withBorder p="xl" radius="md" bg="blue.0">
          <Stack gap="lg" align="center">
            <Title order={2}>Ready to Transform Your Practice?</Title>
            <Text size="lg" maw={600} ta="center">
              Join our growing community of mental health professionals who are spending more time with clients
              and less time on documentation.
            </Text>
            <Button
              component={Link}
              to="/register"
              size="xl"
              rightSection={<IconArrowRight />}
            >
              Start Your Free Trial
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
