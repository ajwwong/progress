import { Title, Paper, Stack, Button, Group, Text } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Patient } from '@medplum/fhirtypes';
import { useEffect, useState } from 'react';
import { IconCalendarPlus } from '@tabler/icons-react';

export function ClientAppointments() {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Patient;
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    medplum.searchResources('Appointment', {
      patient: `Patient/${profile.id}`,
      _sort: '-date',
      _count: '50'
    }).then(setAppointments);
  }, [medplum, profile.id]);

  return (
    <Stack spacing="lg">
      <Group position="apart">
        <Title order={2}>My Appointments</Title>
        <Button leftIcon={<IconCalendarPlus size={16} />}>
          Request Appointment
        </Button>
      </Group>

      <Stack spacing="md">
        {appointments.map((apt: any) => (
          <Paper key={apt.id} p="md" withBorder>
            <Group position="apart">
              <Stack spacing={4}>
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
                  })} - {new Date(apt.end).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </Text>
              </Stack>
              <Text transform="capitalize">{apt.status}</Text>
            </Group>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}