import { Title, Paper, Stack, Text, Group } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Patient } from '@medplum/fhirtypes';
import { useEffect, useState } from 'react';

export function ClientDashboard() {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Patient;
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  useEffect(() => {
    // Load upcoming appointments
    medplum.searchResources('Appointment', {
      patient: `Patient/${profile.id}`,
      date: 'gt' + new Date().toISOString(),
      _sort: 'date',
      _count: '5'
    }).then(setUpcomingAppointments);
  }, [medplum, profile.id]);

  return (
    <Stack spacing="lg">
      <Title order={2}>Welcome Back</Title>
      
      <Paper p="md" withBorder>
        <Stack spacing="md">
          <Title order={3}>Upcoming Appointments</Title>
          {upcomingAppointments.map((apt: any) => (
            <Paper key={apt.id} p="sm" withBorder>
              <Group position="apart">
                <div>
                  <Text fw={500}>
                    {new Date(apt.start).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {new Date(apt.start).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </Text>
                </div>
                <Text>{apt.serviceType?.[0]?.text || 'Therapy Session'}</Text>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}