import { Box, Title, Paper, Group, Stack, Text, Button, Badge, ActionIcon } from '@mantine/core';
import { Document, ResourceTable, useMedplum } from '@medplum/react';
import { useParams } from 'react-router-dom';
import { Patient, Appointment } from '@medplum/fhirtypes';
import { calculateAgeString } from '@medplum/core';
import { IconPlus, IconNotes } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

export function PatientOverview(): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const [patient, setPatient] = useState<Patient>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // Fetch patient data
      medplum.readResource('Patient', id)
        .then(setPatient)
        .catch(console.error);

      // Fetch appointments
      medplum.searchResources('Appointment', {
        patient: `Patient/${id}`,
        _sort: '-date',
        _count: '10'
      })
        .then(setAppointments)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [medplum, id]);

  if (!patient) {
    return <Text>Loading...</Text>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled': return 'green';
      case 'cancelled': return 'red';
      case 'booked': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <Document>
      <Stack spacing="xl">
        {/* Client Information Panel */}
        <Paper p="md" radius="md" withBorder>
          <Title order={3} mb="md">Client Information</Title>
          <Group grow>
            <Stack spacing="xs">
              <Text size="sm" c="dimmed">Demographics</Text>
              <Group spacing="lg">
                <Box>
                  <Text size="sm" c="dimmed">Age</Text>
                  <Text>{patient.birthDate ? calculateAgeString(patient.birthDate) : 'N/A'}</Text>
                </Box>
                <Box>
                  <Text size="sm" c="dimmed">Sex</Text>
                  <Text>{patient.gender || 'N/A'}</Text>
                </Box>
                <Box>
                  <Text size="sm" c="dimmed">Gender Identity</Text>
                  <Text>{patient.gender || 'N/A'}</Text>
                </Box>
              </Group>
            </Stack>
            
            <Stack spacing="xs">
              <Text size="sm" c="dimmed">Contact Information</Text>
              {patient.telecom?.map((contact, index) => (
                <Group key={index}>
                  <Text size="sm" c="dimmed">{contact.system}:</Text>
                  <Text>{contact.value}</Text>
                </Group>
              ))}
            </Stack>
          </Group>
        </Paper>

        {/* Appointment History */}
        <Paper p="md" radius="md" withBorder>
          <Group position="apart" mb="md">
            <Title order={3}>Recent Sessions</Title>
            <Button 
              leftIcon={<IconPlus size={16} />}
              variant="light"
              size="sm"
              component="a"
              href="/calendar"
            >
              Schedule Session
            </Button>
          </Group>

          <Stack spacing="md">
            {appointments.map((appointment) => (
              <Paper key={appointment.id} p="sm" withBorder>
                <Group position="apart">
                  <Stack spacing={4}>
                    <Text fw={500}>
                      {new Date(appointment.start || '').toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {new Date(appointment.start || '').toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })} - {new Date(appointment.end || '').toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </Stack>
                  <Group>
                    <Badge color={getStatusColor(appointment.status || '')}>
                      {appointment.status}
                    </Badge>
                    <ActionIcon 
                      variant="light" 
                      color="blue"
                      component="a"
                      href={`/composition/${appointment.id}`}
                    >
                      <IconNotes size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Document>
  );
}