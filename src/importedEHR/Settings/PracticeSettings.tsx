import { 
  Container, 
  Title, 
  Paper, 
  Stack, 
  Group, 
  TextInput, 
  Textarea, 
  Select, 
  FileInput, 
  Text, 
  Button, 
  Avatar, 
  Tabs, 
  Switch, 
  ColorInput,
  ThemeIcon,
  Divider
} from '@mantine/core';
import { 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Upload, 
  Clock, 
  CreditCard, 
  Shield,
  Palette,
  Users,
  Plus
} from 'lucide-react';

export function PracticeSettings() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={2}>Practice Settings</Title>
            <Text c="dimmed">Manage your practice information and preferences</Text>
          </Stack>
          <Button>Save Changes</Button>
        </Group>

        <Tabs defaultValue="general">
          <Tabs.List>
            <Tabs.Tab value="general" leftSection={<Building size={16} />}>
              General
            </Tabs.Tab>
            <Tabs.Tab value="branding" leftSection={<Palette size={16} />}>
              Branding
            </Tabs.Tab>
            <Tabs.Tab value="team" leftSection={<Users size={16} />}>
              Team
            </Tabs.Tab>
            <Tabs.Tab value="billing" leftSection={<CreditCard size={16} />}>
              Billing
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="general" pt="xl">
            <Stack gap="xl">
              {/* Practice Information */}
              <Paper withBorder p="xl">
                <Stack gap="md">
                  <Title order={4}>Practice Information</Title>
                  
                  <Group grow>
                    <TextInput
                      label="Practice Name"
                      placeholder="Enter practice name"
                      defaultValue="Wellness Therapy Center"
                    />
                    <TextInput
                      label="Tax ID / EIN"
                      placeholder="XX-XXXXXXX"
                    />
                  </Group>

                  <Textarea
                    label="Practice Description"
                    placeholder="Brief description of your practice"
                    minRows={3}
                  />

                  <Group grow>
                    <Select
                      label="Practice Type"
                      placeholder="Select practice type"
                      data={[
                        'Solo Practice',
                        'Group Practice',
                        'Medical Center',
                        'Wellness Center'
                      ]}
                      defaultValue="Solo Practice"
                    />
                    <Select
                      label="Specialty"
                      placeholder="Select primary specialty"
                      data={[
                        'Psychotherapy',
                        'Counseling',
                        'Clinical Psychology',
                        'Psychiatry'
                      ]}
                      defaultValue="Psychotherapy"
                    />
                  </Group>
                </Stack>
              </Paper>

              {/* Contact Information */}
              <Paper withBorder p="xl">
                <Stack gap="md">
                  <Title order={4}>Contact Information</Title>
                  
                  <Group grow>
                    <TextInput
                      label="Email Address"
                      placeholder="practice@example.com"
                      leftSection={<Mail size={16} />}
                    />
                    <TextInput
                      label="Phone Number"
                      placeholder="(555) 123-4567"
                      leftSection={<Phone size={16} />}
                    />
                  </Group>

                  <TextInput
                    label="Website"
                    placeholder="https://www.example.com"
                    leftSection={<Globe size={16} />}
                  />

                  <Stack gap="xs">
                    <Text fw={500}>Practice Address</Text>
                    <Group grow>
                      <TextInput placeholder="Street Address" />
                      <TextInput placeholder="Suite/Unit" />
                    </Group>
                    <Group grow>
                      <TextInput placeholder="City" />
                      <TextInput placeholder="State" />
                      <TextInput placeholder="ZIP Code" />
                    </Group>
                  </Stack>
                </Stack>
              </Paper>

              {/* Business Hours */}
              <Paper withBorder p="xl">
                <Stack gap="md">
                  <Title order={4}>Business Hours</Title>
                  
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                    <Group key={day} align="center">
                      <Text w={100}>{day}</Text>
                      <Select
                        placeholder="Open"
                        data={Array.from({ length: 24 }, (_, i) => ({
                          value: `${i}:00`,
                          label: `${i}:00 ${i < 12 ? 'AM' : 'PM'}`
                        }))}
                        defaultValue="9:00"
                        w={120}
                      />
                      <Text>to</Text>
                      <Select
                        placeholder="Close"
                        data={Array.from({ length: 24 }, (_, i) => ({
                          value: `${i}:00`,
                          label: `${i}:00 ${i < 12 ? 'AM' : 'PM'}`
                        }))}
                        defaultValue="17:00"
                        w={120}
                      />
                      <Switch label="Closed" />
                    </Group>
                  ))}
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="branding" pt="xl">
            <Stack gap="xl">
              <Paper withBorder p="xl">
                <Stack gap="md">
                  <Title order={4}>Brand Identity</Title>

                  <Group align="flex-start">
                    <Stack>
                      <Text fw={500}>Practice Logo</Text>
                      <Avatar 
                        size={100} 
                        radius="md"
                        src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&q=80"
                      />
                      <FileInput
                        placeholder="Upload new logo"
                        size="xs"
                        leftSection={<Upload size={14} />}
                      />
                    </Stack>
                  </Group>

                  <Divider />

                  <Stack gap="md">
                    <Text fw={500}>Brand Colors</Text>
                    <Group>
                      <ColorInput label="Primary Color" defaultValue="#228BE6" />
                      <ColorInput label="Secondary Color" defaultValue="#40C057" />
                      <ColorInput label="Accent Color" defaultValue="#FA5252" />
                    </Group>
                  </Stack>
                </Stack>
              </Paper>

              <Paper withBorder p="xl">
                <Stack gap="md">
                  <Title order={4}>Client Portal Customization</Title>
                  
                  <Textarea
                    label="Welcome Message"
                    placeholder="Message displayed to clients when they log in"
                    minRows={3}
                  />

                  <Stack gap="xs">
                    <Text fw={500}>Portal Features</Text>
                    <Switch label="Enable Online Booking" defaultChecked />
                    <Switch label="Show Availability Calendar" defaultChecked />
                    <Switch label="Allow Document Upload" defaultChecked />
                    <Switch label="Enable Secure Messaging" defaultChecked />
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="team" pt="xl">
            <Stack gap="xl">
              <Paper withBorder p="xl">
                <Stack gap="md">
                  <Group position="apart">
                    <Title order={4}>Team Members</Title>
                    <Button variant="light" leftSection={<Plus size={16} />}>
                      Add Team Member
                    </Button>
                  </Group>

                  {/* Team member list would go here */}
                  <Text c="dimmed">Manage your practice team members and their roles</Text>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="billing" pt="xl">
            <Stack gap="xl">
              <Paper withBorder p="xl">
                <Stack gap="md">
                  <Title order={4}>Payment Settings</Title>
                  
                  <Group grow>
                    <Select
                      label="Default Payment Method"
                      data={[
                        'Credit Card',
                        'Bank Transfer',
                        'Insurance',
                        'Cash'
                      ]}
                    />
                    <Select
                      label="Currency"
                      data={[
                        'USD ($)',
                        'EUR (€)',
                        'GBP (£)',
                        'CAD ($)'
                      ]}
                    />
                  </Group>

                  <Stack gap="xs">
                    <Text fw={500}>Payment Options</Text>
                    <Switch label="Accept Credit Cards" defaultChecked />
                    <Switch label="Accept Insurance" defaultChecked />
                    <Switch label="Enable AutoPay" defaultChecked />
                    <Switch label="Send Payment Reminders" defaultChecked />
                  </Stack>
                </Stack>
              </Paper>

              <Paper withBorder p="xl">
                <Stack gap="md">
                  <Title order={4}>Tax Settings</Title>
                  
                  <Group grow>
                    <TextInput
                      label="Tax Rate (%)"
                      placeholder="Enter tax rate"
                      type="number"
                    />
                    <Select
                      label="Tax Region"
                      placeholder="Select tax region"
                      data={[
                        'United States',
                        'Canada',
                        'European Union',
                        'Other'
                      ]}
                    />
                  </Group>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}