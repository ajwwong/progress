import { Container, Grid, Paper, Stack, Anchor, Group, Title, Text, Button, Badge, Avatar, ActionIcon, Tooltip, Box, SimpleGrid, TextInput, Select } from '@mantine/core';
import { IconCalendar, IconPhone, IconMail, IconMapPin, IconLock, IconUnlock, IconEdit, IconPlus, IconBook, IconCheck } from '@tabler/icons-react';
import { useMedplum } from '@medplum/react';
import { Patient, Appointment, Composition } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';
import { calculateAgeString } from '@medplum/core';
import { useParams } from 'react-router-dom';
import { useResource } from '@medplum/react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { showNotification } from '@mantine/notifications';

const getPronounDisplay = (code: string): string => {
  const pronounMap: Record<string, string> = {
    'he-him': 'He/Him',
    'she-her': 'She/Her',
    'they-them': 'They/Them',
    'other': 'Other'
  };
  return pronounMap[code] || code;
};

export function PatientProfile(): JSX.Element {
  const { id } = useParams();
  const patient = useResource<Patient>({ reference: `Patient/${id}` });
  const navigate = useNavigate();

  if (!patient) {
    return <Loader />;
  }

  const medplum = useMedplum();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentNotes, setAppointmentNotes] = useState<Record<string, Composition | null>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: patient.name?.[0]?.given?.[0] || '',
    familyName: patient.name?.[0]?.family || '',
    phone: patient.telecom?.find(t => t.system === 'phone')?.value || '',
    email: patient.telecom?.find(t => t.system === 'email')?.value || '',
    birthDate: patient.birthDate || '',
    pronouns: patient.extension?.find(e => 
      e.url === 'http://hl7.org/fhir/StructureDefinition/individual-pronouns'
    )?.extension?.find(e => e.url === 'value')?.valueCodeableConcept?.coding?.[0]?.code || '',
    defaultTemplate: 'progress'
  });

  useEffect(() => {
    medplum.searchResources('Appointment', {
      patient: `Patient/${patient.id}`,
      _sort: '-date',
      _count: '50'
    }).then(setAppointments);
  }, [medplum, patient.id]);

  useEffect(() => {
    const fetchNotesForAppointments = async () => {
      const notes: Record<string, Composition | null> = {};
      
      for (const apt of appointments) {
        try {
          const compositions = await medplum.searchResources('Composition', {
            encounter: `Encounter/${apt.id}`,
            _sort: '-date',
            _count: '1'
          });
          notes[apt.id as string] = compositions[0] || null;
        } catch (error) {
          console.error('Error fetching note for appointment:', error);
          notes[apt.id as string] = null;
        }
      }
      
      setAppointmentNotes(notes);
    };

    if (appointments.length > 0) {
      fetchNotesForAppointments();
    }
  }, [medplum, appointments]);

  const upcomingAppointments = appointments
    .filter(apt => new Date(apt.start || '') > new Date())
    .sort((a, b) => new Date(a.start || '').getTime() - new Date(b.start || '').getTime());

  const pastAppointments = appointments.filter(
    apt => new Date(apt.start || '') <= new Date()
  );

  const openAppointmentDetails = (appointment: Appointment) => {
    // Implement this function to open appointment details
  };

  const handleScheduleAppointment = () => {
    navigate('/calendar', { 
      state: { 
        openNewAppointment: true,
        selectedPatient: patient 
      } 
    });
  };

  const handleSaveChanges = async () => {
    try {
      const currentPatient = await medplum.readResource('Patient', patient.id as string);
      
      const updatedPatient = await medplum.updateResource({
        ...currentPatient,
        telecom: [
          { system: 'phone', value: formData.phone },
          { system: 'email', value: formData.email }
        ],
        birthDate: formData.birthDate,
        extension: formData.pronouns ? [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/individual-pronouns',
            extension: [
              {
                url: 'value',
                valueCodeableConcept: {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/ValueSet/pronouns',
                      code: formData.pronouns,
                      display: getPronounDisplay(formData.pronouns)
                    }
                  ],
                  text: getPronounDisplay(formData.pronouns)
                }
              }
            ]
          }
        ] : []
      });

      showNotification({
        title: 'Success',
        message: 'Client information updated successfully',
        color: 'green'
      });

      setIsEditing(false);
      setPatient(updatedPatient);
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to update client information',
        color: 'red'
      });
      console.error('Error updating patient:', error);
    }
  };

  const handleAppointmentClick = (apt: Appointment) => {
    const appointmentDate = new Date(apt.start);
    navigate('/calendar', {
      state: {
        selectedDate: appointmentDate,
        selectedAppointment: {
          ...apt,
          start: appointmentDate,
          end: new Date(apt.end),
          patientName: `${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`,
          patientId: patient.id
        },
        openAppointmentDetails: true
      }
    });
  };

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
                      
                      {/* Note Actions */}
                      {appointmentNotes[apt.id as string] ? (
                        // Note exists
                        <Group spacing="xs">
                          <Tooltip label="Read Note">
                            <ActionIcon 
                              onClick={() => navigate(`/notes/${appointmentNotes[apt.id as string]?.id}`)}
                              color="blue"
                            >
                              <IconBook size={18} />
                            </ActionIcon>
                          </Tooltip>
                          
                          {appointmentNotes[apt.id as string]?.status === 'preliminary' ? (
                            <Tooltip label="Edit Note">
                              <ActionIcon 
                                onClick={() => navigate(`/notes/${appointmentNotes[apt.id as string]?.id}/edit`)}
                                color="blue"
                              >
                                <IconEdit size={18} />
                              </ActionIcon>
                            </Tooltip>
                          ) : (
                            <Tooltip label="Unlock Note">
                              <ActionIcon 
                                onClick={() => navigate(`/notes/${appointmentNotes[apt.id as string]?.id}/unlock`)}
                                color="orange"
                              >
                                <IconLock size={18} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      ) : (
                        // No note exists
                        <Group spacing="xs">
                          <Tooltip label="Create Note">
                            <ActionIcon 
                              onClick={() => navigate(`/notes/new?appointment=${apt.id}`)}
                              color="blue"
                            >
                              <IconPlus size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Grab Note">
                            <ActionIcon 
                              onClick={() => navigate(`/notes/grab?appointment=${apt.id}`)}
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
            </Stack>
          </Paper>
          </Stack>                  
        </Grid.Col>
              
        <Grid.Col span={4}>
          <Stack gap="md">
            {/* Client Information Card */}
            <Paper withBorder p="xl">
              <Stack gap="md">
                {/* Header */}
                <Group position="apart">
                  <Title order={4}>Client Info</Title>
                  <Button 
                    variant="light"
                    size="sm"
                    leftIcon={isEditing ? <IconCheck size={16} /> : <IconEdit size={16} />}
                    onClick={() => {
                      if (isEditing) {
                        handleSaveChanges();
                      } else {
                        setIsEditing(true);
                      }
                    }}
                  >
                    {isEditing ? 'Save Changes' : 'Edit'}
                  </Button>
                </Group>

                {/* Name Section */}
                {isEditing ? (
                  <Group grow>
                    <TextInput
                      label="First Name"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                    <TextInput
                      label="Last Name"
                      value={formData.familyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, familyName: e.target.value }))}
                    />
                  </Group>
                ) : (
                  <Text fw={500} size="lg">{patient.name?.[0]?.text}</Text>
                )}

                {/* Contact Information */}
                <Box>
                  <Text size="sm" fw={500} c="dimmed" mb="xs">Contact Information</Text>
                  {isEditing ? (
                    <Stack spacing="xs">
                      <TextInput
                        icon={<IconPhone size={16} />}
                        placeholder="(555) 555-5555"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                      <TextInput
                        icon={<IconMail size={16} />}
                        placeholder="client@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </Stack>
                  ) : (
                    <Stack spacing="xs">
                      {patient.telecom?.find(t => t.system === 'phone')?.value && (
                        <Group spacing="xs">
                          <IconPhone size={16} />
                          <Text size="sm">{patient.telecom?.find(t => t.system === 'phone')?.value}</Text>
                        </Group>
                      )}
                      {patient.telecom?.find(t => t.system === 'email')?.value && (
                        <Group spacing="xs">
                          <IconMail size={16} />
                          <Text size="sm">{patient.telecom?.find(t => t.system === 'email')?.value}</Text>
                        </Group>
                      )}
                    </Stack>
                  )}
                </Box>

                {/* Documentation Preferences */}
                <Box>
                  <Text size="sm" fw={500} c="dimmed" mb="xs">Documentation Preferences</Text>
                  <Select
                    placeholder="Select default template"
                    value={formData.defaultTemplate}
                    onChange={(value) => setFormData(prev => ({ ...prev, defaultTemplate: value || '' }))}
                    data={[
                      { value: 'initial', label: 'Initial Assessment' },
                      { value: 'progress', label: 'Progress Note' },
                      { value: 'discharge', label: 'Discharge Summary' }
                    ]}
                    disabled={!isEditing}
                  />
                </Box>

                {/* Demographics */}
                <Box>
                  <Text size="sm" fw={500} c="dimmed" mb="xs">Demographics</Text>
                  <Stack spacing="xs">
                    {isEditing ? (
                      <>
                        <TextInput
                          label="Birth Date"
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                        />
                        <Select
                          placeholder="Select pronouns"
                          value={formData.pronouns}
                          onChange={(value) => setFormData(prev => ({ ...prev, pronouns: value || '' }))}
                          data={[
                            { value: 'he-him', label: 'He/Him' },
                            { value: 'she-her', label: 'She/Her' },
                            { value: 'they-them', label: 'They/Them' }
                          ]}
                        />
                      </>
                    ) : (
                      <>
                        {patient.birthDate && (
                          <Group spacing="xs">
                            <IconCalendar size={16} />
                            <Text size="sm">{patient.birthDate}</Text>
                          </Group>
                        )}
                        {patient.extension?.find(e => 
                          e.url === 'http://hl7.org/fhir/StructureDefinition/individual-pronouns'
                        )?.extension?.find(e => e.url === 'value')?.valueCodeableConcept?.coding?.[0]?.code && (
                          <Text size="sm">Pronouns: {getPronounDisplay(patient.extension?.find(e => 
                            e.url === 'http://hl7.org/fhir/StructureDefinition/individual-pronouns'
                          )?.extension?.find(e => e.url === 'value')?.valueCodeableConcept?.coding?.[0]?.code || '')}</Text>
                        )}
                      </>
                    )}
                  </Stack>
                </Box>

                {/* Save/Cancel buttons */}
                {isEditing && (
                  <Group position="right" mt="md">
                    <Button variant="subtle" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={handleSaveChanges}>Save Changes</Button>
                  </Group>
                )}
              </Stack>
            </Paper>

            {/* Upcoming Appointments Card */}
            <Paper withBorder p="xl">
              <Stack gap="md">
                <Title order={4}>Upcoming Appointments</Title>
                
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
                        sx={(theme) => ({
                          fontWeight: 500,
                        })}
                      >
                        {format(new Date(apt.start), 'MM/dd/yyyy')}
                      </Anchor>
                      <Text size="sm" c="dimmed">
                        {format(new Date(apt.start), 'h:mm a')}
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
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}