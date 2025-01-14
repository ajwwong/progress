import { 
  Container, 
  Paper, 
  Stack, 
  Title, 
  Text, 
  Button, 
  Group, 
  ThemeIcon,
  List
} from '@mantine/core';
import { LogOut, Shield, History, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SignOut() {
  const navigate = useNavigate();

  const handleSignOut = () => {
    // Handle sign out logic here
    navigate('/login');
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <Container size="sm" py={120}>
      <Paper withBorder p="xl" radius="md" shadow="md">
        <Stack gap="xl" align="center">
          <ThemeIcon size={80} radius={40} color="blue" variant="light">
            <LogOut size={34} />
          </ThemeIcon>

          <Stack gap="xs" align="center">
            <Title order={2}>Sign Out</Title>
            <Text c="dimmed" ta="center">
              Are you sure you want to sign out of TherapistPro?
            </Text>
          </Stack>

          <Paper withBorder p="md" radius="md" w="100%">
            <Stack gap="md">
              <Text fw={500}>Before you go:</Text>
              <List spacing="sm">
                <List.Item icon={
                  <ThemeIcon color="blue" size={20} variant="light">
                    <Shield size={12} />
                  </ThemeIcon>
                }>
                  All your data is securely saved
                </List.Item>
                <List.Item icon={
                  <ThemeIcon color="blue" size={20} variant="light">
                    <History size={12} />
                  </ThemeIcon>
                }>
                  Your session will be ended on all devices
                </List.Item>
                <List.Item icon={
                  <ThemeIcon color="blue" size={20} variant="light">
                    <Mail size={12} />
                  </ThemeIcon>
                }>
                  You'll still receive important email notifications
                </List.Item>
              </List>
            </Stack>
          </Paper>

          <Group w="100%">
            <Button 
              variant="light" 
              onClick={handleCancel}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button 
              color="red" 
              onClick={handleSignOut}
              leftSection={<LogOut size={16} />}
              style={{ flex: 1 }}
            >
              Sign Out
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}