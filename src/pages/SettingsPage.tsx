import { useState } from 'react';
import { Container, Stack, Group, Title, Text, TextInput, Button, Select, Switch, SegmentedControl, MultiSelect, Tabs, PasswordInput } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { OperationOutcome } from '@medplum/fhirtypes';

export function SettingsPage(): JSX.Element {
  const medplum = useMedplum();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }

       // Call Medplum's change password endpoint
       const response = await medplum.post('auth/changepassword', {
        oldPassword,
        newPassword
      });

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Password successfully changed');
    } catch (err) {
      setError(err.message);
    }
  };

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
                  data={[
                    'Psychotherapy',
                    'Counseling',
                    'Clinical Psychology',
                    'Psychiatry',
                    'Marriage and Family Therapy',
                    'Social Work',
                    'Substance Abuse Counseling',
                    'Child and Adolescent Psychology',
                    'Geriatric Psychology',
                    'Health Psychology',
                    'Neuropsychology',
                    'Forensic Psychology',
                    'Industrial-Organizational Psychology',
                    'School Psychology',
                    'Sports Psychology',
                    'Rehabilitation Psychology',
                    'Behavioral Psychology',
                    'Developmental Psychology',
                    'Educational Psychology',
                    'Environmental Psychology',
                    'Experimental Psychology',
                    'Military Psychology',
                    'Occupational Health Psychology'
                  ]}                />

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
                  'Acceptance and Commitment Therapy (ACT)',
                  'Cognitive Behavioral Therapy (CBT)',
                  'Dialectical Behavior Therapy (DBT)',
                  'Eye Movement Desensitization and Reprocessing (EMDR)',
                  'Psychodynamic Therapy',
                  'Interpersonal Therapy (IPT)',
                  'Mindfulness-Based Cognitive Therapy (MBCT)',
                  'Motivational Interviewing (MI)',
                  'Schema Therapy',
                  'Trauma-Focused Cognitive Behavioral Therapy (TF-CBT)',
                  'Art Therapy',
                  'Family Systems Therapy',
                  'Humanistic Therapy',
                  'Existential Therapy',
                  'Gestalt Therapy',
                  'Rational Emotive Behavior Therapy (REBT)',
                  'Solution-Focused Brief Therapy (SFBT)',
                  'Emotion-Focused Therapy (EFT)',
                  'Narrative Therapy',
                  'Play Therapy',
                  'Compassion-Focused Therapy (CFT)',
                  'Cognitive Processing Therapy (CPT)',
                  'Behavioral Activation (BA)',
                  'Attachment-Based Therapy',
                  'Adlerian Therapy',
                  'Client-Centered Therapy',
                  'Coherence Therapy',
                  'Dream Analysis',
                  'Forensic Psychotherapy',
                  'Functional Analytic Psychotherapy (FAP)',
                  'Group Therapy',
                  'Holistic Therapy',
                  'Hypnotherapy',
                  'Integrative Therapy',
                  'Jungian Therapy',
                  'Logotherapy',
                  'Neuro-Linguistic Programming (NLP)',
                  'Object Relations Therapy',
                  'Pastoral Counseling',
                  'Person-Centered Therapy',
                  'Positive Psychology',
                  'Prolonged Exposure Therapy',
                  'Psychoanalysis',
                  'Relational Therapy',
                  'Sensorimotor Psychotherapy',
                  'Somatic Experiencing',
                  'Supportive Therapy',
                  'Systemic Therapy',
                  'Transactional Analysis',
                  'Transpersonal Therapy'
                ]}
                placeholder="Search and select interventions"
                searchable
                maxSelectedValues={10}
                onChange={(selected) => console.log('Selected interventions:', selected)}
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
          <form onSubmit={handleSubmit}>
            <Stack spacing="xl">
              <Title order={2}>Change Password</Title>
              <Text c="dimmed">Update your account password.</Text>

              <PasswordInput
                label="Current Password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {error && <div style={{ color: 'red' }}>{error}</div>}
              <Button type="submit">Change Password</Button>
            </Stack>
          </form>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}