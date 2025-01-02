import {
  Container,
  Title,
  Paper,
  Stack,
  Group,
  Text,
  Button,
  Switch,
  Select,
  ColorInput,
  Tabs,
  ThemeIcon,
  Divider,
  Badge,
  ActionIcon
} from '@mantine/core';
import {
  Bell,
  Mail,
  Calendar,
  Clock,
  Globe,
  Monitor,
  Moon,
  Volume2,
  MessageSquare,
  Settings,
  Languages,
  Palette,
  Check,
  X
} from 'lucide-react';

export function UserPreferences() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={2}>Preferences</Title>
            <Text c="dimmed">Customize your experience and notification settings</Text>
          </Stack>
          <Button>Save Changes</Button>
        </Group>

        <Tabs defaultValue="notifications">
          <Tabs.List>
            <Tabs.Tab value="notifications" leftSection={<Bell size={16} />}>
              Notifications
            </Tabs.Tab>
            <Tabs.Tab value="appearance" leftSection={<Palette size={16} />}>
              Appearance
            </Tabs.Tab>
            <Tabs.Tab value="communications" leftSection={<MessageSquare size={16} />}>
              Communications
            </Tabs.Tab>
            <Tabs.Tab value="regional" leftSection={<Globe size={16} />}>
              Regional
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="notifications" pt="xl">
            <Stack gap="xl">
              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Title order={4}>Appointment Notifications</Title>

                  <Stack gap="md">
                    <Group position="apart">
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                          <Calendar size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={500}>Upcoming Appointments</Text>
                          <Text size="sm" c="dimmed">
                            Get notified before scheduled appointments
                          </Text>
                        </Stack>
                      </Group>
                      <Group>
                        <Select
                          defaultValue="30"
                          data={[
                            { value: '15', label: '15 minutes before' },
                            { value: '30', label: '30 minutes before' },
                            { value: '60', label: '1 hour before' }
                          ]}
                          w={200}
                        />
                        <Switch size="lg" defaultChecked />
                      </Group>
                    </Group>

                    <Divider />

                    <Group position="apart">
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                          <Clock size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={500}>Daily Schedule Summary</Text>
                          <Text size="sm" c="dimmed">
                            Receive daily agenda every morning
                          </Text>
                        </Stack>
                      </Group>
                      <Group>
                        <Select
                          defaultValue="08:00"
                          data={[
                            { value: '07:00', label: '7:00 AM' },
                            { value: '08:00', label: '8:00 AM' },
                            { value: '09:00', label: '9:00 AM' }
                          ]}
                          w={120}
                        />
                        <Switch size="lg" defaultChecked />
                      </Group>
                    </Group>
                  </Stack>
                </Stack>
              </Paper>

              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Title order={4}>Client Activity</Title>

                  <Stack gap="md">
                    <Group position="apart">
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                          <MessageSquare size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={500}>New Messages</Text>
                          <Text size="sm" c="dimmed">
                            Get notified when clients send messages
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
                          <Text fw={500}>Form Submissions</Text>
                          <Text size="sm" c="dimmed">
                            Get notified when clients complete forms
                          </Text>
                        </Stack>
                      </Group>
                      <Switch size="lg" defaultChecked />
                    </Group>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="appearance" pt="xl">
            <Stack gap="xl">
              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Title order={4}>Display Settings</Title>

                  <Stack gap="md">
                    <Group position="apart">
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                          <Monitor size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={500}>Theme</Text>
                          <Text size="sm" c="dimmed">
                            Choose your preferred color theme
                          </Text>
                        </Stack>
                      </Group>
                      <Select
                        defaultValue="light"
                        data={[
                          { value: 'light', label: 'Light' },
                          { value: 'dark', label: 'Dark' },
                          { value: 'system', label: 'System Default' }
                        ]}
                        w={200}
                      />
                    </Group>

                    <Divider />

                    <Group position="apart">
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                          <Palette size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={500}>Accent Color</Text>
                          <Text size="sm" c="dimmed">
                            Choose your preferred accent color
                          </Text>
                        </Stack>
                      </Group>
                      <ColorInput defaultValue="#228be6" w={200} />
                    </Group>

                    <Divider />

                    <Group position="apart">
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                          <Moon size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={500}>Reduce Motion</Text>
                          <Text size="sm" c="dimmed">
                            Minimize animations and transitions
                          </Text>
                        </Stack>
                      </Group>
                      <Switch size="lg" />
                    </Group>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="communications" pt="xl">
            <Stack gap="xl">
              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Title order={4}>Communication Preferences</Title>

                  <Stack gap="md">
                    <Group position="apart">
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                          <Mail size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={500}>Email Notifications</Text>
                          <Text size="sm" c="dimmed">dr.wilson@example.com</Text>
                        </Stack>
                      </Group>
                      <Group gap="xs">
                        <Badge color="green">Verified</Badge>
                        <Button variant="light" size="xs">Change</Button>
                      </Group>
                    </Group>

                    <Divider />

                    <Group position="apart">
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                          <Volume2 size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={500}>Sound Notifications</Text>
                          <Text size="sm" c="dimmed">
                            Play sounds for important events
                          </Text>
                        </Stack>
                      </Group>
                      <Switch size="lg" defaultChecked />
                    </Group>
                  </Stack>
                </Stack>
              </Paper>

              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Title order={4}>Marketing Preferences</Title>

                  <Stack gap="md">
                    <Group position="apart">
                      <Stack gap={2}>
                        <Text fw={500}>Product Updates</Text>
                        <Text size="sm" c="dimmed">
                          Receive updates about new features and improvements
                        </Text>
                      </Stack>
                      <Switch size="lg" defaultChecked />
                    </Group>

                    <Group position="apart">
                      <Stack gap={2}>
                        <Text fw={500}>Tips & Tutorials</Text>
                        <Text size="sm" c="dimmed">
                          Receive helpful tips and tutorial content
                        </Text>
                      </Stack>
                      <Switch size="lg" defaultChecked />
                    </Group>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="regional" pt="xl">
            <Stack gap="xl">
              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Title order={4}>Regional Settings</Title>

                  <Stack gap="md">
                    <Group position="apart">
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                          <Languages size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={500}>Language</Text>
                          <Text size="sm" c="dimmed">
                            Choose your preferred language
                          </Text>
                        </Stack>
                      </Group>
                      <Select
                        defaultValue="en"
                        data={[
                          { value: 'en', label: 'English (US)' },
                          { value: 'es', label: 'Español' },
                          { value: 'fr', label: 'Français' }
                        ]}
                        w={200}
                      />
                    </Group>

                    <Divider />

                    <Group position="apart">
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                          <Clock size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={500}>Time Zone</Text>
                          <Text size="sm" c="dimmed">
                            Set your local time zone
                          </Text>
                        </Stack>
                      </Group>
                      <Select
                        defaultValue="america-los_angeles"
                        data={[
                          { value: 'america-los_angeles', label: 'Pacific Time (PT)' },
                          { value: 'america-new_york', label: 'Eastern Time (ET)' },
                          { value: 'europe-london', label: 'London (GMT)' }
                        ]}
                        w={200}
                      />
                    </Group>

                    <Divider />

                    <Group position="apart">
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                          <Settings size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={500}>Date Format</Text>
                          <Text size="sm" c="dimmed">
                            Choose how dates are displayed
                          </Text>
                        </Stack>
                      </Group>
                      <Select
                        defaultValue="mm-dd-yyyy"
                        data={[
                          { value: 'mm-dd-yyyy', label: 'MM/DD/YYYY' },
                          { value: 'dd-mm-yyyy', label: 'DD/MM/YYYY' },
                          { value: 'yyyy-mm-dd', label: 'YYYY-MM-DD' }
                        ]}
                        w={200}
                      />
                    </Group>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}