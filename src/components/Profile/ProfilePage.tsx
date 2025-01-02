import {
  Container,
  Title,
  Paper,
  Stack,
  Group,
  Text,
  Button,
  Avatar,
  TextInput,
  PasswordInput,
  Select,
  Divider,
  Badge,
  ThemeIcon,
  ActionIcon,
  Menu
} from '@mantine/core';
import {
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Key,
  Clock,
  Globe,
  Calendar,
  FileText,
  MoreHorizontal,
  Check,
  AlertCircle,
  Lock
} from 'lucide-react';

export function ProfilePage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={2}>My Profile</Title>
            <Text c="dimmed">Manage your personal information and account settings</Text>
          </Stack>
          <Button>Save Changes</Button>
        </Group>

        <Group align="flex-start" grow>
          <Stack style={{ flex: 2 }}>
            <Paper withBorder p="xl">
              <Stack gap="lg">
                <Group position="apart">
                  <Group>
                    <Avatar 
                      size={100}
                      radius="md"
                      src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&q=80"
                    />
                    <Stack gap={4}>
                      <Text size="xl" fw={600}>Dr. Sarah Wilson</Text>
                      <Text c="dimmed">Clinical Psychologist</Text>
                      <Badge color="blue">Professional License: PSY12345</Badge>
                    </Stack>
                  </Group>
                  <Button variant="light">Change Photo</Button>
                </Group>

                <Divider />

                <Stack gap="md">
                  <Text fw={500}>Personal Information</Text>
                  
                  <Group grow>
                    <TextInput
                      label="First Name"
                      defaultValue="Sarah"
                    />
                    <TextInput
                      label="Last Name"
                      defaultValue="Wilson"
                    />
                  </Group>

                  <Group grow>
                    <TextInput
                      label="Email"
                      icon={<Mail size={16} />}
                      defaultValue="dr.wilson@example.com"
                    />
                    <TextInput
                      label="Phone"
                      icon={<Phone size={16} />}
                      defaultValue="(555) 123-4567"
                    />
                  </Group>

                  <Select
                    label="Time Zone"
                    icon={<Globe size={16} />}
                    defaultValue="america/los_angeles"
                    data={[
                      { value: 'america/los_angeles', label: 'Pacific Time (PT)' },
                      { value: 'america/denver', label: 'Mountain Time (MT)' },
                      { value: 'america/chicago', label: 'Central Time (CT)' },
                      { value: 'america/new_york', label: 'Eastern Time (ET)' }
                    ]}
                  />
                </Stack>
              </Stack>
            </Paper>

            <Paper withBorder p="xl">
              <Stack gap="lg">
                <Text fw={500}>Professional Information</Text>

                <TextInput
                  label="Professional Title"
                  defaultValue="Clinical Psychologist"
                />

                <TextInput
                  label="License Number"
                  defaultValue="PSY12345"
                />

                <Group grow>
                  <Select
                    label="Primary Specialty"
                    data={[
                      'Clinical Psychology',
                      'Counseling Psychology',
                      'Psychotherapy',
                      'Neuropsychology'
                    ]}
                    defaultValue="Clinical Psychology"
                  />
                  <Select
                    label="Years of Experience"
                    data={[
                      '0-5 years',
                      '5-10 years',
                      '10-15 years',
                      '15+ years'
                    ]}
                    defaultValue="10-15 years"
                  />
                </Group>
              </Stack>
            </Paper>
          </Stack>

          <Stack style={{ flex: 1 }}>
            <Paper withBorder p="xl">
              <Stack gap="md">
                <Text fw={500}>Account Security</Text>

                <Stack gap="xs">
                  <Group position="apart">
                    <Group>
                      <ThemeIcon size="lg" variant="light" color="blue">
                        <Shield size={18} />
                      </ThemeIcon>
                      <Stack gap={2}>
                        <Text fw={500}>Two-Factor Authentication</Text>
                        <Text size="sm" c="dimmed">Add an extra layer of security</Text>
                      </Stack>
                    </Group>
                    <Badge color="green">Enabled</Badge>
                  </Group>

                  <Group position="apart">
                    <Group>
                      <ThemeIcon size="lg" variant="light" color="blue">
                        <Key size={18} />
                      </ThemeIcon>
                      <Stack gap={2}>
                        <Text fw={500}>Password</Text>
                        <Text size="sm" c="dimmed">Last changed 30 days ago</Text>
                      </Stack>
                    </Group>
                    <Button variant="light" size="xs">Change</Button>
                  </Group>

                  <Group position="apart">
                    <Group>
                      <ThemeIcon size="lg" variant="light" color="blue">
                        <Clock size={18} />
                      </ThemeIcon>
                      <Stack gap={2}>
                        <Text fw={500}>Session Timeout</Text>
                        <Text size="sm" c="dimmed">Automatic logout after inactivity</Text>
                      </Stack>
                    </Group>
                    <Select
                      size="xs"
                      w={100}
                      defaultValue="30"
                      data={[
                        { value: '15', label: '15 min' },
                        { value: '30', label: '30 min' },
                        { value: '60', label: '1 hour' }
                      ]}
                    />
                  </Group>
                </Stack>
              </Stack>
            </Paper>

            <Paper withBorder p="xl">
              <Stack gap="md">
                <Text fw={500}>Recent Activity</Text>

                <Stack gap="sm">
                  <Group position="apart">
                    <Group>
                      <ThemeIcon size="md" variant="light" color="blue">
                        <Lock size={16} />
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text size="sm">Password changed</Text>
                        <Text size="xs" c="dimmed">30 days ago</Text>
                      </Stack>
                    </Group>
                    <Menu position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="subtle">
                          <MoreHorizontal size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<FileText size={14} />}>View Details</Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>

                  <Group position="apart">
                    <Group>
                      <ThemeIcon size="md" variant="light" color="blue">
                        <Shield size={16} />
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text size="sm">2FA enabled</Text>
                        <Text size="xs" c="dimmed">45 days ago</Text>
                      </Stack>
                    </Group>
                    <Menu position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="subtle">
                          <MoreHorizontal size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<FileText size={14} />}>View Details</Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Group>
      </Stack>
    </Container>
  );
}