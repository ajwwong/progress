import { 
  Container, 
  Title, 
  Paper, 
  Stack, 
  Group, 
  Text, 
  Button, 
  Switch,
  ThemeIcon,
  Badge,
  PasswordInput,
  TextInput,
  Progress,
  Divider,
  Avatar,
  Timeline,
  ActionIcon,
  Menu
} from '@mantine/core';
import { 
  Shield, 
  Smartphone, 
  Key, 
  Lock, 
  History,
  AlertCircle,
  Check,
  X,
  LogIn,
  Mail,
  MoreHorizontal,
  Globe,
  Laptop,
  Phone,
  RefreshCcw
} from 'lucide-react';

interface LoginActivity {
  id: string;
  device: string;
  location: string;
  ip: string;
  time: string;
  status: 'success' | 'failed';
}

const recentActivity: LoginActivity[] = [
  {
    id: '1',
    device: 'MacBook Pro',
    location: 'Los Angeles, CA',
    ip: '192.168.1.1',
    time: '2024-02-20 14:30',
    status: 'success'
  },
  {
    id: '2',
    device: 'iPhone 13',
    location: 'Los Angeles, CA',
    ip: '192.168.1.2',
    time: '2024-02-19 09:15',
    status: 'success'
  },
  {
    id: '3',
    device: 'Unknown Device',
    location: 'Seattle, WA',
    ip: '192.168.1.3',
    time: '2024-02-18 16:45',
    status: 'failed'
  }
];

function PasswordStrengthIndicator({ value }: { value: number }) {
  const getStrengthColor = (value: number) => {
    if (value <= 25) return 'red';
    if (value <= 50) return 'orange';
    if (value <= 75) return 'yellow';
    return 'green';
  };

  const getStrengthText = (value: number) => {
    if (value <= 25) return 'Weak';
    if (value <= 50) return 'Fair';
    if (value <= 75) return 'Good';
    return 'Strong';
  };

  return (
    <Stack gap="xs">
      <Progress 
        value={value} 
        color={getStrengthColor(value)} 
        size="sm" 
      />
      <Group position="apart">
        <Text size="sm" c="dimmed">Password Strength:</Text>
        <Badge color={getStrengthColor(value)}>{getStrengthText(value)}</Badge>
      </Group>
    </Stack>
  );
}

function ActivityItem({ activity }: { activity: LoginActivity }) {
  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('macbook')) return Laptop;
    if (device.toLowerCase().includes('iphone')) return Phone;
    return Globe;
  };

  const DeviceIcon = getDeviceIcon(activity.device);

  return (
    <Paper withBorder p="md" mb="sm">
      <Group position="apart">
        <Group>
          <ThemeIcon 
            size="lg" 
            variant="light" 
            color={activity.status === 'success' ? 'blue' : 'red'}
          >
            <DeviceIcon size={18} />
          </ThemeIcon>
          <Stack gap={2}>
            <Group gap="xs">
              <Text fw={500}>{activity.device}</Text>
              <Badge 
                size="sm" 
                color={activity.status === 'success' ? 'green' : 'red'}
              >
                {activity.status === 'success' ? 'Successful' : 'Failed'}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {activity.location} • {activity.time}
            </Text>
          </Stack>
        </Group>

        <Group>
          <Text size="sm" c="dimmed">{activity.ip}</Text>
          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <ActionIcon variant="subtle">
                <MoreHorizontal size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<Lock size={14} />}>Block IP</Menu.Item>
              <Menu.Item leftSection={<History size={14} />}>View Details</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Paper>
  );
}

export function SecuritySettings() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={2}>Security Settings</Title>
            <Text c="dimmed">Manage your account security and privacy preferences</Text>
          </Stack>
          <Button 
            variant="light" 
            color="red" 
            leftSection={<AlertCircle size={16} />}
          >
            Security Alerts (2)
          </Button>
        </Group>

        <Paper withBorder p="xl">
          <Stack gap="lg">
            <Title order={4}>Two-Factor Authentication</Title>
            
            <Group position="apart">
              <Group>
                <ThemeIcon size="lg" variant="light" color="blue">
                  <Smartphone size={18} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text fw={500}>Authenticator App</Text>
                  <Text size="sm" c="dimmed">
                    Use an authenticator app to get verification codes
                  </Text>
                </Stack>
              </Group>
              <Switch size="lg" defaultChecked />
            </Group>

            <Divider />

            <Group position="apart">
              <Group>
                <ThemeIcon size="lg" variant="light" color="blue">
                  <Mail size={18} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text fw={500}>Email Authentication</Text>
                  <Text size="sm" c="dimmed">
                    Get verification codes via email
                  </Text>
                </Stack>
              </Group>
              <Switch size="lg" />
            </Group>
          </Stack>
        </Paper>

        <Paper withBorder p="xl">
          <Stack gap="lg">
            <Title order={4}>Password Settings</Title>

            <Stack gap="md">
              <PasswordInput
                label="Current Password"
                placeholder="Enter current password"
              />
              <PasswordInput
                label="New Password"
                placeholder="Enter new password"
              />
              <PasswordInput
                label="Confirm New Password"
                placeholder="Confirm new password"
              />
              <PasswordStrengthIndicator value={75} />
            </Stack>

            <Button>Update Password</Button>
          </Stack>
        </Paper>

        <Paper withBorder p="xl">
          <Stack gap="lg">
            <Group position="apart">
              <Title order={4}>Recent Activity</Title>
              <Button 
                variant="subtle" 
                leftSection={<RefreshCcw size={16} />}
              >
                Refresh
              </Button>
            </Group>

            {recentActivity.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}

            <Button variant="light" fullWidth>View All Activity</Button>
          </Stack>
        </Paper>

        <Paper withBorder p="xl">
          <Stack gap="lg">
            <Title order={4}>Security Preferences</Title>

            <Stack gap="md">
              <Group position="apart">
                <Group>
                  <ThemeIcon size="lg" variant="light" color="blue">
                    <Lock size={18} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={500}>Automatic Logout</Text>
                    <Text size="sm" c="dimmed">
                      Automatically log out after period of inactivity
                    </Text>
                  </Stack>
                </Group>
                <Switch size="lg" defaultChecked />
              </Group>

              <Group position="apart">
                <Group>
                  <ThemeIcon size="lg" variant="light" color="blue">
                    <Globe size={18} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={500}>Login Notifications</Text>
                    <Text size="sm" c="dimmed">
                      Get notified of new login attempts
                    </Text>
                  </Stack>
                </Group>
                <Switch size="lg" defaultChecked />
              </Group>

              <Group position="apart">
                <Group>
                  <ThemeIcon size="lg" variant="light" color="blue">
                    <Shield size={18} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={500}>HIPAA Compliance Mode</Text>
                    <Text size="sm" c="dimmed">
                      Enable additional security measures
                    </Text>
                  </Stack>
                </Group>
                <Switch size="lg" defaultChecked />
              </Group>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}