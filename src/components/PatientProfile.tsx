import { Container, Grid, Stack, Loader } from '@mantine/core';
import { useParams } from 'react-router-dom';
import { useResource } from '@medplum/react';
import { Patient } from '@medplum/fhirtypes';
import { UpcomingAppointments } from './appointments/UpcomingAppointments';
import { PatientInfo } from './patient/PatientInfo';
import { PatientNotes } from './notes/PatientNotes';

export function PatientProfile(): JSX.Element {
  const { id } = useParams();
  const patient = useResource<Patient>({ reference: `Patient/${id}` });

  if (!patient) {
    return <Loader />;
  }

  return (
    <Container size="xl" py="xl">
      <Grid>
        <Grid.Col span={8}>
          <Stack gap="xl">
            <PatientNotes patient={patient} />
      </Stack>            
        </Grid.Col>
              
        <Grid.Col span={4}>
          <Stack gap="md">
            <PatientInfo patient={patient} />
            <UpcomingAppointments patient={patient} />
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}