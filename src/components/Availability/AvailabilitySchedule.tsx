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
  Tabs,
  ThemeIcon,
  Badge,
  Divider
} from '@mantine/core';
import { 
  Clock, 
  Calendar,
  AlertCircle,
  Video,
  Users,
  Building,
  Repeat,
  Globe,
  ArrowRight
} from 'lucide-react';

export function AvailabilitySchedule() {
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = Array.from({ length: 24 }, (_, i) => ({
    value: `${i}:00`,
    label: `${i}:00 ${i < 12 ? 'AM' : 'PM'}`
  }));

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={2}>Availability & Schedule</Title>
            <Text c="dimmed">Manage your working hours and appointment settings</Text>
          </Stack>
          <Button>Save Changes</Button>
        </Group>

        <Tabs defaultValue="hours">
          <Tabs.List>
            <Tabs.Tab value="hours" leftSection={<Clock size={16} />}>
              Working Hours
            </Tabs.Tab>
            <Tabs.Tab value="appointments" leftSection={<Calendar size={16} />}>
              Appointment Types
            </Tabs.Tab>
            <Tabs.Tab value="breaks" leftSection={<AlertCircle size={16} />}>
              Breaks & Time Off
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="hours" pt="xl">
            <Stack gap="xl">
              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Group position="apart">
                    <Stack gap={0}>
                      <Title order={4}>Regular Hours</Title>
                      <Text size="sm" c="dimmed">Set your standard working hours for each day</Text>
                    </Stack>
                    <Switch label="Currently Available" size="md" defaultChecked />
                  </Group>

                  <Divider />

                  {weekDays.map((day) => (
                    <Group key={day} align="center" wrap="nowrap">
                      <Text w={100} fw={500}>{day}</Text>
                      <Select
                        placeholder="Start time"
                        data={timeSlots}
                        defaultValue="9:00"
                        w={120}
                      />
                      <ArrowRight size={16} style={{ color: 'var(--mantine-color-gray-5)' }} />
                      <Select
                        placeholder="End time"
                        data={timeSlots}
                        defaultValue="17:00"
                        w={120}
                      />
                      <Switch 
                        label="Available" 
                        defaultChecked
                        styles={{ label: { fontSize: 'var(--mantine-font-size-sm)' } }}
                      />
                    </Group>
                  ))}
                </Stack>
              </Paper>

              <Paper withBorder p="xl">
                <Stack gap="md">
                  <Title order={4}>Scheduling Rules</Title>
                  
                  <Group grow align="flex-start">
                    <Stack gap="xs">
                      <Text fw={500}>Appointment Buffer</Text>
                      <Select
                        label="Time between appointments"
                        defaultValue="15"
                        data={[
                          { value: '0', label: 'No buffer' },
                          { value: '5', label: '5 minutes' },
                          { value: '10', label: '10 minutes' },
                          { value: '15', label: '15 minutes' },
                          { value: '30', label: '30 minutes' }
                        ]}
                      />
                    </Stack>

                    <Stack gap="xs">
                      <Text fw={500}>Advance Notice</Text>
                      <Select
                        label="Minimum notice for bookings"
                        defaultValue="24"
                        data={[
                          { value: '0', label: 'No notice required' },
                          { value: '2', label: '2 hours' },
                          { value: '4', label: '4 hours' },
                          { value: '24', label: '24 hours' },
                          { value: '48', label: '48 hours' }
                        ]}
                      />
                    </Stack>

                    <Stack gap="xs">
                      <Text fw={500}>Future Bookings</Text>
                      <Select
                        label="How far in advance"
                        defaultValue="60"
                        data={[
                          { value: '7', label: '1 week' },
                          { value: '14', label: '2 weeks' },
                          { value: '30', label: '1 month' },
                          { value: '60', label: '2 months' },
                          { value: '90', label: '3 months' }
                        ]}
                      />
                    </Stack>
                  </Group>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="appointments" pt="xl">
            <Stack gap="xl">
              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Group position="apart">
                    <Title order={4}>Appointment Types</Title>
                    <Button variant="light" size="sm">Add Type</Button>
                  </Group>

                  {[
                    {
                      name: 'Individual Therapy',
                      duration: '50 min',
                      price: '$150',
                      type: 'video',
                      icon: Video
                    },
                    {
                      name: 'Couples Therapy',
                      duration: '80 min',
                      price: '$200',
                      type: 'in-person',
                      icon: Users
                    },
                    {
                      name: 'Initial Consultation',
                      duration: '30 min',
                      price: '$75',
                      type: 'both',
                      icon: Building
                    }
                  ].map((apt, index) => (
                    <Paper key={index} withBorder p="md">
                      <Group position="apart">
                        <Group>
                          <ThemeIcon size="lg" variant="light" color="blue">
                            <apt.icon size={18} />
                          </ThemeIcon>
                          <Stack gap={4}>
                            <Text fw={500}>{apt.name}</Text>
                            <Group gap="xs">
                              <Badge size="sm" variant="dot">{apt.duration}</Badge>
                              <Badge size="sm" variant="dot">{apt.price}</Badge>
                              <Badge size="sm" variant="outline">
                                {apt.type === 'video' ? 'Video Only' : 
                                 apt.type === 'in-person' ? 'In-Person Only' : 
                                 'Video & In-Person'}
                              </Badge>
                            </Group>
                          </Stack>
                        </Group>
                        <Button variant="subtle" size="sm">Edit</Button>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Paper>

              <Paper withBorder p="xl">
                <Stack gap="md">
                  <Title order={4}>Recurring Appointments</Title>
                  <Group position="apart">
                    <Group>
                      <ThemeIcon size="lg" variant="light" color="blue">
                        <Repeat size={18} />
                      </ThemeIcon>
                      <Stack gap={4}>
                        <Text fw={500}>Enable Recurring Bookings</Text>
                        <Text size="sm" c="dimmed">Allow clients to schedule recurring appointments</Text>
                      </Stack>
                    </Group>
                    <Switch size="md" defaultChecked />
                  </Group>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="breaks" pt="xl">
            <Stack gap="xl">
              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Group position="apart">
                    <Stack gap={0}>
                      <Title order={4}>Time Off & Holidays</Title>
                      <Text size="sm" c="dimmed">Schedule your breaks and vacation time</Text>
                    </Stack>
                    <Button variant="light">Add Time Off</Button>
                  </Group>

                  <Paper withBorder p="md">
                    <Group position="apart">
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="orange">
                          <Globe size={18} />
                        </ThemeIcon>
                        <Stack gap={4}>
                          <Text fw={500}>Thanksgiving Break</Text>
                          <Text size="sm" c="dimmed">Nov 23 - Nov 24, 2024</Text>
                        </Stack>
                      </Group>
                      <Badge color="orange">Holiday</Badge>
                    </Group>
                  </Paper>

                  <Paper withBorder p="md">
                    <Group position="apart">
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                          <Calendar size={18} />
                        </ThemeIcon>
                        <Stack gap={4}>
                          <Text fw={500}>Winter Vacation</Text>
                          <Text size="sm" c="dimmed">Dec 24 - Jan 2, 2025</Text>
                        </Stack>
                      </Group>
                      <Badge color="blue">Vacation</Badge>
                    </Group>
                  </Paper>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}