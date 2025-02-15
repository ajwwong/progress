import { Anchor, Button, Stack, Text, Title, Group, Paper, ThemeIcon, List, Divider, Container, SimpleGrid, Box, Image } from '@mantine/core';
import { Document } from '@medplum/react';
import { Link } from 'react-router-dom';
import { IconBrain, IconHeartHandshake, IconCheck } from '@tabler/icons-react';

export function LandingPage(): JSX.Element {
  return (
    <Document width={1000}>
      <Container size="xl" py="xl">
        <Stack spacing="xl">
          <Group align="center" justify="center">
            <Image
              src="/droplet.png"
              alt="Practice Harbor Logo"
              width={125}
              height={125}
              mr={50}
            />
            <Stack spacing={0}>
              <Title order={1} style={{ fontSize: '2.8rem', margin: 0, lineHeight: 1 }}>
                Welcome to Progress Notes
              </Title>
              <Text size="xl" c="dimmed" style={{ lineHeight: 1.2 }}>
                Your Modern, AI-Enhanced Practice Management Life Saver
              </Text>
            </Stack>
          </Group>

          <Divider my="xl" />

          <SimpleGrid cols={2} spacing={50} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
            <Paper shadow="md" radius="md" p={35} withBorder>
              <Stack spacing="lg">
                <ThemeIcon size={56} radius="md" variant="light" color="blue">
                  <IconBrain size={28} />
                </ThemeIcon>
                <Title order={3}>For Mental Health Providers</Title>
                <List spacing="md" size="lg" center icon={
                  <ThemeIcon color="blue" size={28} radius="xl">
                    <IconCheck size={18} />
                  </ThemeIcon>
                }>
                  <List.Item>AI-Powered Clinical Documentation</List.Item>
                  <List.Item>Smart Voice-to-Text Transcription</List.Item>
                  <List.Item>Intelligent Scheduling System</List.Item>
                  <List.Item>Integrated Progress Notes</List.Item>                </List>
              </Stack>
            </Paper>

            <Paper shadow="md" radius="md" p={35} withBorder>
              <Stack spacing="lg">
                <ThemeIcon size={56} radius="md" variant="light" color="green">
                  <IconHeartHandshake size={28} />
                </ThemeIcon>
                <Title order={3}>Get Started Now</Title>
                <Text size="lg">
                  Join the future of mental health practice management. Create your therapist account today and focus more on what matters - helping your clients thrive.
                </Text>
                <Group mt="auto" grow>
                  <Button 
                    component={Link} 
                    to="/pre-register" 
                    size="lg" 
                    radius="md"
                  >
                    Register
                  </Button>
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
    </Document>
  );
}
