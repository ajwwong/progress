import { Container, Grid, Paper, Stack, Group, Title, Text, Button, Badge, Avatar } from '@mantine/core';
import { IconCalendar, IconPhone, IconMail, IconMapPin } from '@tabler/icons-react';
import { useMedplum } from '@medplum/react';
import { Patient, Appointment } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';
import { calculateAgeString } from '@medplum/core';
import { useParams } from 'react-router-dom';
import { useResource } from '@medplum/react';

export function PatientProfile(): JSX.Element {
  const { id } = useParams();
  const patient = useResource<Patient>({ reference: `Patient/${id}` });

  if (!patient) {
    return <Loader />;
  }

  const medplum = useMedplum();
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    medplum.searchResources('Appointment', {
      patient: `Patient/${patient.id}`,
      _sort: '-date',
      _count: '50'
    }).then(setAppointments);
  }, [medplum, patient.id]);

  const upcomingAppointments = appointments.filter(
    apt => new Date(apt.start || '') > new Date()
  );

  const pastAppointments = appointments.filter(
    apt => new Date(apt.start || '') <= new Date()
  );

  return (
    <Container size="xl" py="xl">
      <Grid>
        <Grid.Col span={8}>
          <Stack gap="xl">
            <Paper withBorder p="xl">
            <Stack gap="lg">
                    <Title order={4}>Timeline</Title>
              
              {pastAppointments.map((apt) => (
                <Paper key={apt.id} p="md" withBorder>
                  <Group position="apart">
                    <Stack spacing={4}>
                      <Text fw={500} style={{ color: '#a9a9a9' }}>
                        {new Date(apt.start || '').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        }).replace(/(\w{3})\s(\d+)/, (match, p1, p2) => `${p1.toUpperCase()} ${p2}`)}
                      </Text>
                      <Text size="sm" c="dimmed" style={{ color: '#a9a9a9' }}>
                        {new Date(apt.start || '').toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </Text>
                    </Stack>
                    <Group>
                      <Text>{apt.serviceType?.[0]?.text || 'Therapy Session'}</Text>
                      <Badge color={apt.status === 'fulfilled' ? 'green' : 'blue'}>
                        {apt.status}
                      </Badge>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Paper>
          </Stack>                  
        </Grid.Col>
              
        <Grid.Col span={4}>
          <Stack gap="md">
            {/* Client Information Card */}
            <Paper withBorder p="xl">
              <Stack gap="md">
                <Group>
                  <Avatar size="xl" radius="xl" />
                  <div>
                    <Text fw={500} size="lg">{patient.name?.[0]?.text}</Text>
                    <Text size="sm" c="dimmed">
                      {patient.birthDate && `${calculateAgeString(patient.birthDate)} old`}
                    </Text>
                  </div>
                </Group>

                <Stack gap="xs">
                  {patient.telecom?.map((contact, index) => (
                    <Group key={index} spacing="xs">
                      {contact.system === 'phone' && <IconPhone size={16} />}
                      {contact.system === 'email' && <IconMail size={16} />}
                      <Text size="sm">{contact.value}</Text>
                    </Group>
                  ))}
                  {patient.address?.[0] && (
                    <Group spacing="xs">
                      <IconMapPin size={16} />
                      <Text size="sm">
                        {patient.address[0].line?.[0]}, {patient.address[0].city}, {patient.address[0].state}
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Stack>
            </Paper>

            {/* Upcoming Appointments Card */}
            <Paper withBorder p="xl">
              <Stack gap="md">
                <Title order={4}>Upcoming Appointments</Title>
                
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.slice(0, 3).map((apt) => (
                    <Paper key={apt.id} p="md" withBorder>
                      <Stack spacing={4}>
                        <Text fw={500}>
                          {new Date(apt.start || '').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          }).replace(/(\w{3})\s(\d+)/, '$1 $2')}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {new Date(apt.start || '').toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </Text>
                        <Text size="sm">{apt.serviceType?.[0]?.text || 'Therapy Session'}</Text>
                      </Stack>
                    </Paper>
                  ))
                ) : (
                  <Text c="dimmed" size="sm">No upcoming appointments</Text>
                )}

                <Button 
                  variant="light" 
                  fullWidth 
                  leftSection={<IconCalendar size={16} />}
                >
                  Schedule Appointment
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}