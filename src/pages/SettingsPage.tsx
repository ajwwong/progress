import { Container, Stack, Group, Title, Text, TextInput, Button, Select, Switch, SegmentedControl, MultiSelect, Tabs } from '@mantine/core';

export function SettingsPage(): JSX.Element {
  return (
    <Container size="md" py="xl">
      <Tabs defaultValue="profile">
        <Tabs.List>
          <Tabs.Tab value="profile">Profile</Tabs.Tab>
          <Tabs.Tab value="note-preferences">Note Preferences</Tabs.Tab>
          <Tabs.Tab value="change-password">Change Password</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile" pt="xl">
          <Stack spacing="xl">
            <Title order={2}>Settings</Title>
            <Text c="dimmed">Manage account preferences and note settings.</Text>

            <Group align="flex-start" spacing="xl">
              <Stack style={{ flex: 1 }}>
                <Title order={3}>Profile</Title>
                <Text c="dimmed">Personalize your experience.</Text>

                <TextInput
                  label="Email"
                  value="jjwong@gmail.com"
                  disabled
                />

                <TextInput
                  label="Name"
                  placeholder="Enter your name"
                  defaultValue="Albert Wong"
                />

                <TextInput
                  label="Title"
                  placeholder="Enter title"
                />

                <Select
                  label="Specialty"
                  placeholder="Enter your specialty"
                  data={['Specialty 1', 'Specialty 2', 'Specialty 3']}
                />

                <Button color="blue">Save</Button>
              </Stack>
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="note-preferences" pt="xl">
          <Stack spacing="xl">
            <Title order={2}>Note preferences</Title>
            <Text c="dimmed">These settings will be applied to all future notes.</Text>

            <Stack spacing="md">
              <Text fw={500}>How do you refer to the person you are supporting?</Text>
              <SegmentedControl
                data={[
                  { label: 'Patient', value: 'patient' },
                  { label: 'Client', value: 'client' },
                ]}
              />

              <Text fw={500}>Would you like to include quotes in your notes?</Text>
              <SegmentedControl
                data={[
                  { label: 'Exclude quotes', value: 'exclude' },
                  { label: 'Include quotes', value: 'include' },
                ]}
              />

              <Text fw={500}>Interventions</Text>
              <MultiSelect
                data={[
                  'Cognitive Behavioral Therapy (CBT)',
                  'Enhanced Cognitive Behavior Therapy (CBT-E)',
                  'Dialectical Behavior Therapy (DBT)',
                  'Acceptance and Commitment Therapy (ACT)',
                ]}
                placeholder="Search..."
              />

              <Button color="blue">Save</Button>

              <Group position="apart" mt="md">
                <Text fw={500}>Include date & time for 'Copy note'</Text>
                <Switch label="When enabled, 'Copy Note' will include the date and time." />
              </Group>

              <Group position="apart">
                <Text fw={500}>Record storage settings</Text>
                <Switch label="Delete notes after 30 days" />
              </Group>
            </Stack>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="change-password" pt="xl">
          {/* Change Password Content */}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}