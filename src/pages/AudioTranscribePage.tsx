import { Box, Button, Container, Group, Text, Title, Modal, TextInput, Stack, ActionIcon, Paper, Divider } from '@mantine/core';
import { IconPlayerRecord, IconPlayerStop, IconPlayerPlay, IconFileText, IconNotes, IconPlayerPause, IconPlus, IconCheck, IconX } from '@tabler/icons-react';
import { useState, useRef, useEffect, forwardRef } from 'react';
import { useMedplum, AsyncAutocomplete, ResourceAvatar } from '@medplum/react';
import { Composition, Patient } from '@medplum/fhirtypes';
import { getDisplayString } from '@medplum/core';
import { useNavigate } from 'react-router-dom';
import { showNotification } from '@mantine/notifications';

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

interface AudioTranscribePageProps {
  onTranscriptionStart: (time: string) => void;
  onCompositionSaved: () => void;
}

export function AudioTranscribePage({ onTranscriptionStart, onCompositionSaved }: AudioTranscribePageProps): JSX.Element {
  const medplum = useMedplum();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [status, setStatus] = useState('Ready');
  const [psychNote, setPsychNote] = useState<string>('');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [savedComposition, setSavedComposition] = useState<Composition>();
  const [selectedPatient, setSelectedPatient] = useState<Patient>();
  const navigate = useNavigate();
  const [createPatientModalOpen, setCreatePatientModalOpen] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({ name: '' });
  const [showCreateButton, setShowCreateButton] = useState(false);

  // Existing useEffect and function implementations remain exactly the same
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setIsBlinking(prev => !prev);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    if (!selectedPatient) {
      setStatus('Please select a patient before recording');
      return;
    }

    try {
      setStatus('Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunksRef.current = [];

      const profile = await medplum.getProfile();
      const practitionerName = profile.name?.[0] ? 
        `${profile.name[0].given?.[0] || ''} ${profile.name[0].family || ''}`.trim() : 
        'Unknown Practitioner';

      const initialComposition = {
        resourceType: 'Composition',
        status: 'preliminary',
        type: {
          coding: [{
            system: 'http://loinc.org',
            code: '11488-4',
            display: 'Consultation note'
          }]
        },
        date: new Date().toISOString(),
        title: 'Therapy Session Notes',
        author: [{
          reference: `Practitioner/${profile.id}`,
          display: practitionerName
        }],
        subject: {
          reference: `Patient/${selectedPatient.id}`,
          display: getDisplayString(selectedPatient)
        },
        section: []
      };

      const savedComp = await medplum.createResource(initialComposition);
      setSavedComposition(savedComp);
      onCompositionSaved();

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setStatus('Recording saved');
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setStatus('Recording...');
    } catch (err) {
      console.error('Error starting recording:', err);
      setStatus('Error: Could not start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const playAudio = async () => {
    if (!audioBlob) return;
    try {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.onended = () => URL.revokeObjectURL(audio.src);
      await audio.play();
    } catch (err) {
      console.error('Error playing audio:', err);
      setStatus('Error: Could not play audio');
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob || !savedComposition) return;
    try {
      const now = new Date();
      const timeString = now.toLocaleString();
      onTranscriptionStart(timeString);
      
      setStatus('Processing audio...');
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);
      
      setStatus('Uploading to server...');
      const binary = await medplum.createBinary({
        data: audioData,
        contentType: audioBlob.type
      });
      
      setStatus('Transcribing...');
      const response = await medplum.executeBot(
        '1255675e-266d-4ab9-bc69-a850c6ca4875',
        {
          type: 'audio',
          binaryId: binary.id
        },
        'application/json'
      );

      if (response.details?.transcript) {
        setTranscript(response.details.transcript);
        
        const updatedComposition = {
          ...savedComposition,
          section: [
            {
              title: 'Transcript',
              text: {
                status: 'generated',
                div: `<div xmlns="http://www.w3.org/1999/xhtml">${response.details.transcript}</div>`
              }
            }
          ],
          subject: savedComposition.subject
        };

        const updated = await medplum.updateResource(updatedComposition);
        setSavedComposition(updated);
        setStatus('Transcription complete');
      } else {
        setStatus('Error: No transcript received');
      }
    } catch (err) {
      console.error('Error transcribing:', err);
      setStatus('Error: Transcription failed');
    }
  };

  const generateNote = async () => {
    if (!transcript) return;
    
    setStatus('Generating psychotherapy note...');
    
    try {
      const prompt = `As an experienced psychodynamically-oriented therapist, create a rich, insightful, and valuable psychotherapy note based on the following therapy session transcript. Your note should demonstrate deep clinical expertise and provide a comprehensive psychodynamic perspective on the session. Please include the following elements in your note:

1. Session Overview
2. Client Presentation
3. Psychodynamic Formulation
4. Key Moments
5. Interpretation and Insight
6. Treatment Progress
7. Future Directions

Transcript:
${transcript}`;

      const response = await medplum.executeBot(
        '5731008c-42a6-4fdc-8969-2560667b4f1d',
        { text: prompt },
        'application/json'
      );

      if (response.text) {
        setPsychNote(response.text);
        try {
          const composition = await saveComposition(transcript, response.text, selectedPatient);
          
          const timeString = new Date().toLocaleString();
          onTranscriptionStart(`${timeString} - ${selectedPatient?.name?.[0].given?.join(' ') || ''} ${selectedPatient?.name?.[0].family || ''}`);
          
          setStatus('Psychotherapy note generated');
        } catch (compositionErr) {
          console.error('Error saving composition:', compositionErr);
          setStatus(`Error: Could not save composition - ${compositionErr.message}`);
        }
      } else {
        setStatus('Error: No note generated');
      }
    } catch (err) {
      console.error('Error generating note:', err);
      setStatus(`Error: Could not generate note - ${err.message}`);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.resume();
      setIsPaused(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      setAudioBlob(null);
      chunksRef.current = [];
    }
  };

  const saveComposition = async (transcript: string, note: string, patient: Patient | undefined) => {
    if (!patient || !savedComposition) {
      throw new Error('Missing patient or composition data');
    }

    try {
      const updatedComposition = {
        ...savedComposition,
        status: 'final',
        section: [
          {
            title: 'Psychotherapy Note',
            text: {
              status: 'generated',
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${note}</div>`
            }
          },
          {
            title: 'Transcript',
            text: {
              status: 'generated',
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${transcript}</div>`
            }
          }
        ],
        subject: { display: getDisplayString(patient) }
      };

      const updated = await medplum.updateResource(updatedComposition);
      setSavedComposition(updated);
      onCompositionSaved();

      return updated;
    } catch (err) {
      console.error('Error saving composition:', err);
      throw err;
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.pause();
      setIsPaused(true);
    }
  };

  const handleCreateNewPatient = async () => {
    try {
      const nameParts = newPatientForm.name.trim().split(' ');
      const lastName = nameParts.pop() || '';
      const firstName = nameParts.join(' ');

      const newPatient = await medplum.createResource({
        resourceType: 'Patient',
        name: [{
          given: firstName ? [firstName] : undefined,
          family: lastName
        }]
      });

      setSelectedPatient(newPatient);
      setCreatePatientModalOpen(false);
      setNewPatientForm({ name: '' });
      
      showNotification({
        title: 'Success',
        message: 'Patient created successfully',
        color: 'green',
        icon: <IconCheck size={16} />
      });
    } catch (error) {
      console.error('Error creating patient:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to create patient',
        color: 'red',
        icon: <IconX size={16} />
      });
    }
  };

  return (
    <Container size="lg" mt="xl">
      <Paper shadow="sm" radius="md" p="xl" withBorder>
        <Title order={2} mb="xl">Audio Session Recorder</Title>
        
        <Stack spacing="lg">
          <Box>
            <Group align="flex-end" spacing="xs">
              <Box style={{ flex: 1 }}>
                <AsyncAutocomplete
                  label="Select Patient"
                  placeholder="Search by patient name..."
                  loadOptions={async (input, signal) => {
                    if (!input) return [];
                    return await medplum.searchResources('Patient', `name:contains=${input}`, { signal });
                  }}
                  toOption={(patient) => ({
                    value: patient.id as string,
                    label: getDisplayString(patient),
                    resource: patient,
                  })}
                  itemComponent={ItemComponent}
                  onChange={(patients) => {
                    if (patients?.[0]) {
                      setSelectedPatient(patients[0]);
                    }
                  }}
                  maxValues={1}
                  required
                />
              </Box>
              <ActionIcon
                variant="light"
                color="blue"
                size="lg"
                radius="md"
                onClick={() => setCreatePatientModalOpen(true)}
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Group>
          </Box>

          <Paper p="md" radius="md" bg="gray.0">
            <Group position="apart" mb="xs">
              <Text size="sm" weight={500}>Status</Text>
              <Text size="sm" color={status.includes('Error') ? 'red' : 'dimmed'}>{status}</Text>
            </Group>

            {isRecording && (
              <Box mb="md">
                <Group position="apart" align="center">
                  {!isPaused && (
                    <Box 
                      sx={(theme) => ({
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: theme.colors.red[6],
                        opacity: isBlinking ? 1 : 0.3,
                        transition: 'opacity 0.3s ease'
                      })}
                    />
                  )}
                  <Text size="sm" color="dimmed" align="center" style={{ flex: 1 }}>
                    {isPaused ? 'Recording Paused' : 'Recording in Progress'}
                  </Text>
                </Group>
              </Box>
            )}

            <Stack spacing="md">
              {!isRecording ? (
                <Button
                  fullWidth
                  size="md"
                  color="blue"
                  leftIcon={<IconPlayerRecord size={20} />}
                  onClick={startRecording}
                  disabled={!selectedPatient}
                >
                  Start Recording
                </Button>
              ) : (
                <Group grow>
                  <Button
                    color="red"
                    leftIcon={<IconPlayerStop size={20} />}
                    onClick={stopRecording}
                  >
                    End Session
                  </Button>
                  <Button
                    color="yellow"
                    onClick={isPaused ? resumeRecording : pauseRecording}
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    variant="subtle"
                    color="gray"
                    onClick={cancelRecording}
                  >
                    Cancel
                  </Button>
                </Group>
              )}

              {audioBlob && !isRecording && (
                <Group grow>
                  <Button
                    color="green"
                    leftIcon={<IconPlayerPlay size={20} />}
                    onClick={playAudio}
                  >
                    Play Recording
                  </Button>
                  <Button
                    color="teal"
                    leftIcon={<IconFileText size={20} />}
                    onClick={transcribeAudio}
                  >
                    Transcribe
                  </Button>
                </Group>
              )}

              {transcript && (
                <Button
                  color="pink"
                  leftIcon={<IconNotes size={20} />}
                  onClick={generateNote}
                >
                  Generate Note
                </Button>
              )}
            </Stack>
          </Paper>

          {(transcript || psychNote) && (
            <Stack spacing="lg" mt="md">
              {transcript && (
                <Paper p="md" radius="md" withBorder>
                  <Title order={3} size="h5" mb="md">Transcript</Title>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{transcript}</Text>
                </Paper>
              )}

              {psychNote && (
                <Paper p="md" radius="md" withBorder>
                  <Title order={3} size="h5" mb="md">Psychotherapy Note</Title>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{psychNote}</Text>
                </Paper>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Modal
        opened={createPatientModalOpen}
        onClose={() => setCreatePatientModalOpen(false)}
        title="Create New Patient"
        size="md"
      >
        <Stack spacing="md">
          <TextInput
            label="Full Name"
            required
            value={newPatientForm.name}
            onChange={(e) => setNewPatientForm({ name: e.target.value })}
            placeholder="Enter patient's full name"
          />
          <Group position="right" mt="md">
            <Button variant="subtle" onClick={() => setCreatePatientModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateNewPatient}
              disabled={!newPatientForm.name.trim()}
            >
              Create Patient
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}