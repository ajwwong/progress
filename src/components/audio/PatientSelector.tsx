import { Box, Group, ActionIcon, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { AsyncAutocomplete, ResourceAvatar } from '@medplum/react';
import { Patient } from '@medplum/fhirtypes';
import { getDisplayString } from '@medplum/core';
import { useMedplum } from '@medplum/react';
import { forwardRef } from 'react';

const ItemComponent = forwardRef<HTMLDivElement, { resource: Patient }>(({ resource, ...others }, ref) => (
  <div ref={ref} {...others}>
    <Group wrap="nowrap">
      <ResourceAvatar value={resource} />
      <div>
        <Text>{getDisplayString(resource)}</Text>
        <Text size="xs" c="dimmed">{resource.birthDate}</Text>
      </div>
    </Group>
  </div>
));

interface PatientSelectorProps {
  selectedPatient?: Patient;
  onPatientSelect: (patient: Patient) => void;
  onCreateClick: () => void;
}

export function PatientSelector({ selectedPatient, onPatientSelect, onCreateClick }: PatientSelectorProps): JSX.Element {
  const medplum = useMedplum();

  return (
    <Box>
      <Group align="flex-end" spacing="xs">
        <Box style={{ flex: 1 }}>
          <AsyncAutocomplete
            label="Select Patient"
            placeholder="Search by patient name..."
            loadOptions={async (input, signal) => {
              if (!input) return [];
              return await medplum.searchResources('Patient', `name:contains=${input}`, { signal });
            }}
            toOption={(patient) => ({
              value: patient.id as string,
              label: getDisplayString(patient),
              resource: patient,
            })}
            itemComponent={ItemComponent}
            onChange={(patients) => {
              if (patients?.[0]) {
                onPatientSelect(patients[0]);
              }
            }}
            maxValues={1}
            required
          />
        </Box>
        <ActionIcon
          variant="light"
          color="blue"
          size="lg"
          radius="md"
          onClick={onCreateClick}
        >
          <IconPlus size={18} />
        </ActionIcon>
      </Group>
    </Box>
  );
}
