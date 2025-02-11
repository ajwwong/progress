import { Container, Title, Text, List, ThemeIcon, Box, Paper, Stack, Group, Button, Timeline } from '@mantine/core';
import { IconLock, IconShield, IconKey, IconDatabase, IconUser, IconBuildingHospital, IconArrowRight } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export function PreRegisterPage(): JSX.Element {
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
            Registration Process
          </Title>
          <Text c="dimmed" mt="md" size="xl">
            Our two-account system ensures security and proper access management
          </Text>
        </Box>

        <Paper withBorder p="xl" radius="md">
          <Timeline active={1} bulletSize={32} lineWidth={2}>
            <Timeline.Item 
              bullet={<IconUser size={16} />} 
              title="Step 1: Create Test Patient Account"
            >
              <Text color="dimmed" size="sm">
                First, you'll create a test patient account. This will give us a patient to work with in our tutorial:
              </Text>
              <List
                spacing="xs"
                size="sm"
                center
                mt={10}
              >
                <List.Item>You can invent any name for the test patient that you like</List.Item>
                <List.Item>However, you need to choose a *real* email address that you have access to</List.Item>
                <List.Item>This needs to be a different email address from the one you will officially use for your practice account</List.Item>
              </List>
            </Timeline.Item>

            <Timeline.Item 
              bullet={<IconBuildingHospital size={16} />} 
              title="Step 2: Create Your Real Practice Account"
            >
              <Text color="dimmed" size="sm">
                Next, you'll set up your actual practice account to:
              </Text>
              <List
                spacing="xs"
                size="sm"
                center
                mt={10}
              >
                <List.Item>Access practice management features</List.Item>
                <List.Item>Manage patient records and appointments</List.Item>
                <List.Item>Handle billing and administrative tasks (coming soon)</List.Item>
              </List>
            </Timeline.Item>
          </Timeline>
        </Paper>

        <Paper withBorder p="xl" radius="md" bg="blue.0">
          <Stack spacing="md">
            <Title order={3}>Why Two Separate Accounts?</Title>
            <Text>
              This dual-account system is designed to provide you with a comprehensive understanding 
              of both the provider and patient experience. It also ensures proper security 
              segregation between different access levels in the system. 


            </Text>
            <Group mt="md">
              <Button 
                component={Link} 
                to="/register" 
                size="lg" 
                rightIcon={<IconArrowRight size={18} />}
              >
                Start Registration Process
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
