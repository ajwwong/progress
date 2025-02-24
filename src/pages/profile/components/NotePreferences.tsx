import { Stack, Title, Text, Paper, Radio, Group, Button, MultiSelect, Switch } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useState } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import { normalizeErrorString } from '@medplum/core';
import { Practitioner, Extension } from '@medplum/fhirtypes';

export function NotePreferences(): JSX.Element {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Practitioner;
  const [loading, setLoading] = useState(false);
  const [includeDatetime, setIncludeDatetime] = useState(false);
  const [deleteAfter30Days, setDeleteAfter30Days] = useState(false);
  const [referencePreference, setReferencePreference] = useState(
    profile?.extension?.find((e: Extension) => e.url === 'https://progress.care/fhir/reference-preference')?.valueString || 'client'
  );
  const [quotePreference, setQuotePreference] = useState(
    profile?.extension?.find((e: Extension) => e.url === 'https://progress.care/fhir/quote-preference')?.valueString || 'exclude'
  );
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>(
    JSON.parse(profile?.extension?.find((e: Extension) => e.url === 'https://progress.care/fhir/interventions')?.valueString || '[]')
  );

  const handleNotePreferencesUpdate = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      await medplum.updateResource({
        ...profile,
        extension: [
          ...(profile.extension?.filter(e => 
            e.url !== 'https://progress.care/fhir/reference-preference' && 
            e.url !== 'https://progress.care/fhir/quote-preference' &&
            e.url !== 'https://progress.care/fhir/interventions'
          ) || []),
          {
            url: 'https://progress.care/fhir/reference-preference',
            valueString: referencePreference
          },
          {
            url: 'https://progress.care/fhir/quote-preference',
            valueString: quotePreference
          },
          {
            url: 'https://progress.care/fhir/interventions',
            valueString: JSON.stringify(selectedInterventions)
          }
        ]
      });

      showNotification({
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Note preferences updated successfully'
      });
    } catch (err) {
      showNotification({
        color: 'red',
        icon: <IconCircleOff />,
        title: 'Error',
        message: normalizeErrorString(err)
      });
    }
    setLoading(false);
  };

  return (
    <Stack gap="xl">
      <Title order={2}>Note preferences</Title>
      <Text c="dimmed">These settings will be applied to all future notes.</Text>

      <Stack gap="md">
        <Text fw={500}>How do you refer to the person you are supporting?</Text>
        <Radio.Group value={referencePreference} onChange={setReferencePreference}>
          <Group>
            <Radio label="Patient" value="patient" />
            <Radio label="Client" value="client" />
            <Radio label="Use their name" value="name" />
          </Group>
        </Radio.Group>

        <Text fw={500}>Would you like to include quotes in your notes?</Text>
        <Radio.Group value={quotePreference} onChange={setQuotePreference}>
          <Group>
            <Radio label="Exclude quotes" value="exclude" />
            <Radio label="Include quotes" value="include" />
          </Group>
        </Radio.Group>

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
            'Solution-Focused Brief Therapy (SFBT)'
          ]}
          placeholder="Search and select interventions"
          searchable
          maxDropdownHeight={200}
          value={selectedInterventions}
          onChange={setSelectedInterventions}
        />

        <Button color="blue" onClick={handleNotePreferencesUpdate} loading={loading}>
          Save Note Preferences
        </Button>

        <Group justify="apart" mt="md">
          <Text fw={500}>Include date & time for 'Copy note'</Text>
          <Switch 
            label="When enabled, 'Copy Note' will include the date and time."
            checked={includeDatetime}
            onChange={(event) => setIncludeDatetime(event.currentTarget.checked)}
          />
        </Group>

        <Group justify="apart">
          <Text fw={500}>Record storage settings</Text>
          <Switch 
            label="Delete notes after 30 days"
            checked={deleteAfter30Days}
            onChange={(event) => setDeleteAfter30Days(event.currentTarget.checked)}
          />
        </Group>
      </Stack>
    </Stack>
  );
}
