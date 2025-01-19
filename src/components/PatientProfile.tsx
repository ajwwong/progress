import { Container, Grid, Paper, Stack, Anchor, Group, Title, Text, Button, Collapse, Badge, Avatar, ActionIcon, Tooltip, Box, SimpleGrid, TextInput, Select, Center, Loader, Textarea, Modal } from '@mantine/core';
import { IconCalendar, IconPhone, IconMail, IconMapPin, IconLock, IconChevronDown, IconUnlock, IconEdit, IconPlus, IconBook, IconCheck, IconMicrophone, IconChevronRight, IconWand } from '@tabler/icons-react';
import { useMedplum } from '@medplum/react';
import { Patient, Appointment, Composition } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';
import { calculateAgeString } from '@medplum/core';
import { useParams } from 'react-router-dom';
import { useResource } from '@medplum/react';
import { format } from 'date-fns';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { showNotification } from '@mantine/notifications';
import { notifications } from '@mantine/notifications';

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
  const [compositions, setCompositions] = useState<{ [key: string]: Composition[] }>({});
  const [compositionsLoading, setCompositionsLoading] = useState(true);
  const [compositionsError, setCompositionsError] = useState<string>();
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const [editedSections, setEditedSections] = useState<{ [key: string]: string }>({});
  const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set());
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [magicInstructions, setMagicInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingSection, setEditingSection] = useState<{noteId: string, sectionTitle: string} | null>(null);

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

  useEffect(() => {
    if (patient.id) {
      medplum.searchResources('Composition', {
        subject: `Patient/${patient.id}`,
        _sort: '-date',
        _count: 100
      })
        .then(results => {
          const groupedComps: { [key: string]: Composition[] } = {};
          results.forEach(comp => {
            const typeDisplay = comp.type?.coding?.[0]?.display || 
                              comp.type?.text || 
                              'Other Notes';
            if (!groupedComps[typeDisplay]) {
              groupedComps[typeDisplay] = [];
            }
            groupedComps[typeDisplay].push(comp);
          });
          setCompositions(groupedComps);
        })
        .catch(err => {
          console.error('Error fetching compositions:', err);
          setCompositionsError('Error loading notes');
        })
        .finally(() => setCompositionsLoading(false));
    }
  }, [medplum, patient.id]);

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

  const handleStartRecording = () => {
    navigate('/audio', { 
      state: { 
        selectedPatient: patient 
      } 
    });
  };

  const toggleNote = (noteId: string) => {
    setOpenNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const handleSaveSection = async (noteId: string, sectionTitle: string) => {
    // Find the specific note we're editing
    const composition = await medplum.readResource('Composition', noteId);
    if (!composition) return;

    const updatedComposition = {
      ...composition,
      section: composition.section?.map(section => {
        if (section.title === sectionTitle) {
          return {
            ...section,
            text: {
              div: editedSections[sectionTitle],
              status: 'generated'
            }
          };
        }
        return section;
      })
    };

    try {
      // Update the composition in Medplum
      await medplum.updateResource(updatedComposition);
      
      // Fetch the updated compositions to refresh the state
      const updatedCompositions = await medplum.searchResources('Composition', {
        patient: `Patient/${patient.id}`,
        _sort: '-date'
      });

      // Group compositions by type
      const groupedCompositions = updatedCompositions.reduce((acc, comp) => {
        const type = comp.type?.text || 'Other';
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(comp);
        return acc;
      }, {} as Record<string, Composition[]>);

      setCompositions(groupedCompositions);
      
      // Clear modification tracking
      setModifiedSections(prev => {
        const next = new Set(prev);
        next.delete(sectionTitle);
        return next;
      });
      
      setEditingSection(null);
      
      notifications.show({
        title: 'Success',
        message: 'Changes saved successfully',
        color: 'green'
      });
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save changes',
        color: 'red'
      });
    }
  };

  const handleTextChange = (sectionTitle: string, newText: string) => {
    setEditedSections(prev => ({
      ...prev,
      [sectionTitle]: newText
    }));
    setModifiedSections(prev => {
      const next = new Set(prev);
      next.add(sectionTitle);
      return next;
    });
  };

  const handleMagicEdit = async (sectionTitle: string) => {
    if (!editingSection || sectionTitle !== 'Psychotherapy Note') return;
    
    setIsProcessing(true);
    try {
      const currentNote = editedSections['Psychotherapy Note'];
      const transcript = editedSections['Transcript'];
      const prompt = `As an experienced psychodynamically-oriented therapist, please adjust the following psychotherapy note according to these instructions:

${magicInstructions}

Current note:
${currentNote}

Original transcript for reference:
${transcript}

Please provide the complete adjusted note while maintaining the same professional therapeutic style and structure.`;

      const response = await medplum.executeBot(
        '5731008c-42a6-4fdc-8969-2560667b4f1d',
        { text: prompt },
        'application/json'
      );

      if (response.text) {
        handleTextChange(sectionTitle, response.text);
        setShowMagicModal(false);
      }
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to process magic edit',
        color: 'red'
      });
    } finally {
      setIsProcessing(false);
    }
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

            {/* Clinical Notes Card */}
           <Stack spacing="xl">
        <Group position="apart">
          <Title order={2}>All Patient Notes</Title>
          <Button 
            component="a"
            href="/transcribe"
          >
            <Group spacing={8}>
              <IconChevronRight size={16} />
              <span>New Note</span>
            </Group>
          </Button>
        </Group>

        {Object.entries(compositions).map(([type, notes]) => (
          <Stack key={type} spacing="md">
            <Title order={3} sx={(theme) => ({
              backgroundColor: theme.colors.gray[1],
              padding: theme.spacing.md,
              borderRadius: theme.radius.sm
            })}>
              {type} ({notes.length})
            </Title>
            
            <Stack spacing="md">
              {notes.slice(0, 20).map((note) => (
                <Stack key={note.id} spacing="xs">
                  {note.section
                    ?.filter(section => section.title !== 'Transcript')
                    ?.map((section, index) => {
                      const isEditing = editingSection?.noteId === note.id && editingSection?.sectionTitle === section.title;
                      const textContent = section.text?.div
                        ? section.text.div.replace(/<[^>]*>/g, '')
                        : '';
                      
                      return (
                        <Paper 
                          key={index} 
                          withBorder 
                          p="md"
                          sx={(theme) => ({
                            borderColor: isEditing ? theme.colors.blue[4] : theme.colors.gray[2],
                            backgroundColor: theme.white,
                            transition: 'all 200ms ease',
                            '&:hover': {
                              borderColor: theme.colors.blue[4],
                              backgroundColor: theme.colors.gray[0]
                            },
                            '&:focus-within': {
                              borderColor: theme.colors.blue[5]
                            }
                          })}
                        >
                          <Group position="apart" mb="md">
                            <Group spacing="xs">
                              <Text weight={600} size="sm" color="blue">
                                {section.title}
                              </Text>
                              <Text size="xs" color="dimmed">
                                {format(new Date(note.date || ''), 'MMM d, yyyy')}
                              </Text>
                            </Group>
                            <Group spacing="xs">
                              {isEditing ? (
                                <>
                                  {section.title === 'Psychotherapy Note' && (
                                    <Tooltip label="Magic Edit">
                                      <ActionIcon
                                        onClick={() => setShowMagicModal(true)}
                                        variant="light"
                                        color="violet"
                                        size="lg"
                                      >
                                        <IconWand size={20} />
                                      </ActionIcon>
                                    </Tooltip>
                                  )}
                                  <Button
                                    onClick={() => handleSaveSection(note.id || '', section.title || '')}
                                    variant="light"
                                    color="blue"
                                    size="sm"
                                    leftIcon={<IconCheck size={16} />}
                                  >
                                    Save Changes
                                  </Button>
                                  <Button
                                    onClick={() => setEditingSection(null)}
                                    variant="subtle"
                                    color="gray"
                                    size="sm"
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <Tooltip label="Edit Section">
                                  <ActionIcon
                                    onClick={() => {
                                      setEditingSection({ noteId: note.id || '', sectionTitle: section.title || '' });
                                      setEditedSections(prev => ({
                                        ...prev,
                                        [section.title || '']: textContent
                                      }));
                                    }}
                                    variant="light"
                                    color="blue"
                                    size="sm"
                                  >
                                    <IconEdit size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </Group>
                          </Group>
                          
                          {isEditing ? (
                            <>
                              <Box mb={8}>
                                <Text size="sm" color="dimmed" sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <IconEdit size={14} />
                                  Click inside to edit
                                </Text>
                              </Box>
                              <Textarea
                                value={editedSections[section.title || '']}
                                onChange={(e) => handleTextChange(section.title || '', e.currentTarget.value)}
                                minRows={5}
                                autosize
                                styles={(theme) => ({
                                  input: {
                                    backgroundColor: theme.white,
                                    border: `1px solid ${theme.colors.gray[2]}`,
                                    transition: 'all 200ms ease',
                                    '&:hover': {
                                      borderColor: theme.colors.blue[2],
                                      backgroundColor: theme.colors.gray[0],
                                    },
                                    '&:focus': {
                                      borderColor: theme.colors.blue[5],
                                      backgroundColor: theme.white,
                                    },
                                  },
                                })}
                              />
                            </>
                          ) : (
                            <Text 
                              size="sm" 
                              lineClamp={3}
                              sx={(theme) => ({
                                color: theme.colors.gray[7],
                                lineHeight: 1.6,
                              })}
                            >
                              {textContent}
                            </Text>
                          )}
                        </Paper>
                      );
                    })}
                </Stack>
              ))}
            </Stack>
          </Stack>
        ))}
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
                            <Text size="sm">{format(new Date(patient.birthDate), 'MM/dd/yyyy')}</Text>
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
                <Group position="apart">
                  <Title order={4}>Upcoming Appointments</Title>
                  <Group>
                    <Button 
                      variant="light" 
                      size="sm"
                      leftIcon={<IconMicrophone size={16} />}
                      onClick={handleStartRecording}
                    >
                      Record Session
                    </Button>
                  </Group>
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

      {/* Magic Edit Modal */}
      <Modal
        opened={showMagicModal}
        onClose={() => setShowMagicModal(false)}
        title={<Title order={3}>Magic Edit - Psychotherapy Note</Title>}
        size="lg"
      >
        <Stack spacing="md">
          <Textarea
            label="Edit Instructions"
            description="Describe how you want to modify the note"
            placeholder="e.g., 'Expand on the client's attachment patterns' or 'Add more detail about treatment progress'"
            value={magicInstructions}
            onChange={(e) => setMagicInstructions(e.currentTarget.value)}
            minRows={3}
            autosize
            styles={(theme) => ({
              input: {
                backgroundColor: theme.colors.gray[0]
              }
            })}
          />
          <Group position="right">
            <Button 
              onClick={() => setShowMagicModal(false)}
              variant="subtle"
              color="gray"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleMagicEdit(editingSection?.sectionTitle || '')}
              loading={isProcessing}
              color="violet"
            >
              Apply Magic Edit
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}