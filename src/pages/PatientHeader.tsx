import { Patient, Reference } from '@medplum/fhirtypes';
import { HumanNameDisplay, useResource } from '@medplum/react';
import { Paper, Group, Text, Stack, Title } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';
import { format } from 'date-fns';

export interface PatientHeaderProps {
  readonly patient: Patient | Reference<Patient>;
}

export function PatientHeader(props: PatientHeaderProps): JSX.Element | null {
  const patient = useResource(props.patient);
  if (!patient) {
    return null;
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="xs">
        <Group gap="xs">
          <Title order={2}>
            {patient.name ? <HumanNameDisplay value={patient.name?.[0]} options={{ use: false }} /> : '[blank]'}
          </Title>
          {patient.birthDate && (
            <Group gap={4}>
              <IconCalendar size={16} style={{ color: 'var(--mantine-color-gray-6)' }} />
              <Text size="sm" c="dimmed">
                {format(new Date(patient.birthDate), 'MMM d, yyyy')}
              </Text>
            </Group>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}
