import { Paper, Stack, Group, Text, Badge, ActionIcon, Tooltip, Loader } from '@mantine/core';
import { IconBook, IconEdit, IconLock, IconPlus } from '@tabler/icons-react';
import { Patient } from '@medplum/fhirtypes';
import { useNavigate } from 'react-router-dom';
import { usePatientAppointments } from '../../hooks/usePatientAppointments';

interface AppointmentTimelineProps {
  patient: Patient;
}

export function AppointmentTimeline({ patient }: AppointmentTimelineProps) {
  const navigate = useNavigate();
  const { pastAppointments, isLoading, error } = usePatientAppointments(patient);

  if (isLoading) {
    return (
      <Paper withBorder p="xl">
        <Stack align="center">
          <Loader />
          <Text size="sm" c="dimmed">Loading appointments...</Text>
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper withBorder p="xl">
        <Text c="red" size="sm">Error loading appointments: {error.message}</Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder p="xl">
      <Stack gap="lg">
        <Text fw={500} size="lg">Timeline</Text>
        
        {pastAppointments.map((apt) => (
          <Paper key={apt.id} p="md" withBorder>
            <Group justify="space-between">
              <Stack gap={4}>
                <Text fw={500} c="dimmed">
                  {new Date(apt.start || '').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  }).replace(/(\w{3})\s(\d+)/, (match, p1, p2) => `${p1.toUpperCase()} ${p2}`)}
                </Text>
                <Text size="sm" c="dimmed">
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
                
                {/* Note Actions */}
                {apt.note ? (
                  // Note exists
                  <Group gap="xs">
                    <Tooltip label="Read Note">
                      <ActionIcon 
                        onClick={() => navigate(`/notes/${apt.note?.id}`)}
                        variant="light"
                        color="blue"
                      >
                        <IconBook size={18} />
                      </ActionIcon>
                    </Tooltip>
                    
                    {apt.note?.status === 'preliminary' ? (
                      <Tooltip label="Edit Note">
                        <ActionIcon 
                          onClick={() => navigate(`/notes/${apt.note?.id}/edit`)}
                          variant="light"
                          color="blue"
                        >
                          <IconEdit size={18} />
                        </ActionIcon>
                      </Tooltip>
                    ) : (
                      <Tooltip label="Unlock Note">
                        <ActionIcon 
                          onClick={() => navigate(`/notes/${apt.note?.id}/unlock`)}
                          variant="light"
                          color="orange"
                        >
                          <IconLock size={18} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                ) : (
                  // No note exists
                  <Group gap="xs">
                    <Tooltip label="Create Note">
                      <ActionIcon 
                        onClick={() => navigate(`/notes/new?appointment=${apt.id}`)}
                        variant="light"
                        color="blue"
                      >
                        <IconPlus size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Grab Note">
                      <ActionIcon 
                        onClick={() => navigate(`/notes/grab?appointment=${apt.id}`)}
                        variant="light"
                        color="green"
                      >
                        <IconBook size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                )}
              </Group>
            </Group>
          </Paper>
        ))}

        {pastAppointments.length === 0 && (
          <Text c="dimmed" ta="center">No past appointments</Text>
        )}
      </Stack>
    </Paper>
  );
} 