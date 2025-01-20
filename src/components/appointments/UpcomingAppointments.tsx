import { Paper, Stack, Group, Text, Button, Anchor, Loader } from '@mantine/core';
import { IconCalendar, IconMicrophone } from '@tabler/icons-react';
import { Patient } from '@medplum/fhirtypes';
import { useNavigate } from 'react-router-dom';
import { usePatientAppointments } from '../../hooks/usePatientAppointments';
import { format } from 'date-fns';

interface UpcomingAppointmentsProps {
  patient: Patient;
}

export function UpcomingAppointments({ patient }: UpcomingAppointmentsProps) {
  const navigate = useNavigate();
  const { upcomingAppointments, isLoading, error } = usePatientAppointments(patient);

  const handleStartRecording = () => {
    navigate('/audio', { 
      state: { selectedPatient: patient } 
    });
  };

  const handleScheduleAppointment = () => {
    navigate('/calendar', { 
      state: { 
        openNewAppointment: true,
        selectedPatient: patient 
      } 
    });
  };

  const handleAppointmentClick = (apt: typeof upcomingAppointments[0]) => {
    const appointmentDate = new Date(apt.start || '');
    navigate('/calendar', {
      state: {
        selectedDate: appointmentDate,
        selectedAppointment: {
          ...apt,
          start: appointmentDate,
          end: new Date(apt.end || ''),
          patientName: `${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`,
          patientId: patient.id
        },
        openAppointmentDetails: true
      }
    });
  };

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
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={500} size="lg">Upcoming Appointments</Text>
          <Button 
            variant="light" 
            size="sm"
            leftSection={<IconMicrophone size={16} />}
            onClick={handleStartRecording}
          >
            Record Session
          </Button>
        </Group>
        
        {upcomingAppointments.length > 0 ? (
          <Stack gap="xs">
            {upcomingAppointments.slice(0, 5).map((apt) => (
              <Group 
                key={apt.id}
                style={{
                  padding: '4px 0',
                  borderBottom: '1px solid var(--mantine-color-gray-2)'
                }}
              >
                <Anchor
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAppointmentClick(apt);
                  }}
                  style={{ fontWeight: 500 }}
                >
                  {format(new Date(apt.start || ''), 'MM/dd/yyyy')}
                </Anchor>
                <Text size="sm" c="dimmed">
                  {format(new Date(apt.start || ''), 'h:mm a')}
                </Text>
              </Group>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" size="sm">No upcoming appointments</Text>
        )}

        <Button 
          variant="light" 
          fullWidth 
          leftSection={<IconCalendar size={16} />}
          onClick={handleScheduleAppointment}
        >
          Schedule Appointment
        </Button>
      </Stack>
    </Paper>
  );
} 