import { Patient, Reference } from '@medplum/fhirtypes';
import { HumanNameDisplay, MedplumLink, useResource } from '@medplum/react';
import { Title, Paper, Group, Stack, Text } from '@mantine/core';
import classes from './PatientHeader.module.css';

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
      <Stack spacing="xs">
        <MedplumLink to={patient}>
          <Title order={1}>
            {patient.name ? <HumanNameDisplay value={patient.name?.[0]} options={{ use: false }} /> : '[blank]'}
          </Title>
        </MedplumLink>
        {patient.birthDate && (
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              {new Date(patient.birthDate).toLocaleDateString()}
            </Text>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
