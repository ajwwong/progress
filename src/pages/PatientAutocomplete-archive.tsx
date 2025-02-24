/*import { Box, Container, Title } from '@mantine/core';
import { AsyncAutocomplete, useMedplum } from '@medplum/react';
import { Patient } from '@medplum/fhirtypes';
import { getDisplayString } from '@medplum/core';
import { forwardRef, useState } from 'react';
import { ResourceAvatar } from '@medplum/react';
import { Group, Text } from '@mantine/core';
import { MantineTheme } from '@mantine/core';

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

export function PatientAutocompletePage(): JSX.Element {
  const medplum = useMedplum();
  const [selectedPatient, setSelectedPatient] = useState<Patient>();

  const loadPatients = async (input: string, signal: AbortSignal): Promise<Patient[]> => {
    if (!input) {
      return [];
    }
    
    try {
      return await medplum.searchResources('Patient', `name:contains=${input}`, {
        signal,
      });
    } catch (err) {
      console.error('Error searching patients:', err);
      return [];
    }
  };

  const toOption = (patient: Patient) => ({
    value: patient.id as string,
    label: getDisplayString(patient),
    resource: patient,
  });

  const styles = (theme: MantineTheme) => ({
    root: {
      // your styles here
    }
  });

  return (
    <Container size="sm" mt="xl">
      <Box p="xl" sx={styles}>
        <Title order={1} mb="xl">Patient Search Test</Title>
        
        <AsyncAutocomplete
          label="Search Patients"
          placeholder="Type to search..."
          loadOptions={loadPatients}
          toOption={toOption}
          itemComponent={ItemComponent}
          onChange={(patients) => {
            if (patients?.[0]) {
              setSelectedPatient(patients[0]);
              console.log('Selected patient:', patients[0]);
            }
          }}
          maxValues={1}
          required
        />

        {selectedPatient && (
          <Box mt="xl">
            <Title order={2} size="h4" mb="md">Selected Patient</Title>
            <Text>Name: {getDisplayString(selectedPatient)}</Text>
            <Text>ID: {selectedPatient.id}</Text>
            <Text>Birth Date: {selectedPatient.birthDate}</Text>
          </Box>
        )}
      </Box>
    </Container>
  );
}*/