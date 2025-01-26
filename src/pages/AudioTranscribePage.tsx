import { Box, Button, Container, Group, Text, Title, Modal, TextInput, Stack, ActionIcon, Paper, Divider, SegmentedControl, Select, Loader, Progress } from '@mantine/core';
import { IconPlayerRecord, IconPlayerStop, IconPlayerPlay, IconFileText, IconNotes, IconPlayerPause, IconPlus, IconCheck, IconX, IconLoader } from '@tabler/icons-react';
import { useState, useRef, useEffect } from 'react';
import { useMedplum, AsyncAutocomplete, ResourceAvatar } from '@medplum/react';
import { Composition, Patient, Practitioner } from '@medplum/fhirtypes';
import { getDisplayString } from '@medplum/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { showNotification } from '@mantine/notifications';
import { PatientSelector } from '../components/shared/PatientSelector';
import { AudioControls } from '../components/audio/AudioControls';
import { TranscriptionView } from '../components/audio/TranscriptionView';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { useTranscription } from '../hooks/useTranscription';
import { useActiveComposition } from '../hooks/useActiveComposition';
import { useTemplates } from '../components/templates/hooks/useTemplates';
import { NoteTemplate } from '../components/templates/types';

interface AudioTranscribePageProps {
  onTranscriptionStart?: (time: string) => void;
  onCompositionSaved?: () => void;
}

interface AudioControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  isBlinking: boolean;
  hasTranscript: boolean;
  hasAudioBlob: boolean;
  status: string;
  disabled?: boolean;
  isTranscribing: boolean;
  isGeneratingNote: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onCancelRecording: () => void;
  onPlayAudio: () => void;
  onTranscribeAudio: () => void;
  onGenerateNote: () => void;
}

export function AudioTranscribePage({ onTranscriptionStart, onCompositionSaved }: AudioTranscribePageProps): JSX.Element {
  const medplum = useMedplum();
  const { templates } = useTemplates();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isRecording,
    isPaused,
    isBlinking,
    audioBlob,
    status: recordingStatus,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    playAudio
  } = useAudioRecording();

  const {
    savedComposition,
    createInitialComposition,
  } = useActiveComposition();

  const {
    transcript,
    psychNote,
    status: processingStatus,
    transcribeAudio,
    generateNote
  } = useTranscription();
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>(undefined);
  const [isTelehealth, setIsTelehealth] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | undefined>(undefined);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Set initial values from location state
  useEffect(() => {
    if (location.state?.selectedPatient) {
      setSelectedPatient(location.state.selectedPatient);
    }
  }, [location.state]);

  // Load patient's default template when patient is selected or changes
  useEffect(() => {
    const loadDefaultTemplate = async () => {
      console.log('Loading default template. Patient:', selectedPatient?.id);
      console.log('Templates available:', templates.length);
      
      if (selectedPatient && selectedPatient.id && templates.length > 0) {
        try {
          // Get patient's documentation preferences
          const patientResource = await medplum.readResource('Patient', selectedPatient.id);
          console.log('Patient resource loaded:', patientResource);
          
          const defaultTemplateId = patientResource.extension?.find(
            ext => ext.url === 'http://example.com/fhir/StructureDefinition/default-template'
          )?.valueString;
          
          console.log('Found default template ID:', defaultTemplateId);

          if (defaultTemplateId) {
            const template = templates.find(t => t.id === defaultTemplateId);
            console.log('Matching template found:', template?.name);
            setSelectedTemplate(template);
          }
        } catch (err) {
          console.error('Error loading patient default template:', err);
        }
      }
    };

    loadDefaultTemplate();
  }, [selectedPatient, templates, medplum]);

  // Update selectedTemplate when templates load and we have a default template from navigation
  useEffect(() => {
    const defaultTemplateId = location.state?.defaultTemplate;
    if (defaultTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === defaultTemplateId);
      setSelectedTemplate(template);
    }
  }, [location.state, templates]);

  const handleStartRecording = async () => {
    if (!selectedPatient) {
      showNotification({
        title: 'Error',
        message: 'Please select a patient before recording',
        color: 'red'
      });
      return;
    }

    try {
      // Create initial composition before starting recording
      await createInitialComposition(selectedPatient, selectedTemplate);
      onCompositionSaved?.();

      await startRecording(isTelehealth);
    } catch (err) {
      showNotification({
        title: 'Error',
        message: 'Could not start recording',
        color: 'red'
      });
    }
  };

  const handleTranscribeAudio = async () => {
    if (!audioBlob) {
      console.log('No audioBlob available');
      return;
    }
    
    if (!savedComposition?.id) {
      console.log('No composition ID available');
      showNotification({
        title: 'Error',
        message: 'No active session found. Please start a new recording.',
        color: 'red'
      });
      return;
    }
    
    console.log('Starting transcription with blob size:', audioBlob.size);
    setIsTranscribing(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      await transcribeAudio(audioBlob, savedComposition.id, onTranscriptionStart);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      console.log('Transcription completed successfully');
      
      showNotification({
        title: 'Success',
        message: 'Audio transcribed successfully',
        color: 'green'
      });
    } catch (err) {
      console.error('Detailed transcription error:', err);
      showNotification({
        title: 'Error',
        message: 'Failed to transcribe audio',
        color: 'red'
      });
    } finally {
      setIsTranscribing(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleGenerateNote = async () => {
    if (!transcript) return;
    
    if (!savedComposition?.id) {
      console.log('No composition ID available');
      showNotification({
        title: 'Error',
        message: 'No active session found. Please start a new recording.',
        color: 'red'
      });
      return;
    }
    
    setIsGeneratingNote(true);
    try {
      await generateNote(transcript, selectedPatient, selectedTemplate, savedComposition.id);
        showNotification({
        title: 'Success',
        message: 'Note generated and saved successfully',
          color: 'green'
        });
    } catch (err) {
      showNotification({
        title: 'Error',
        message: 'Failed to generate note',
        color: 'red'
      });
    } finally {
      setIsGeneratingNote(false);
    }
  };

  // Combine recording status and processing status
  const displayStatus = isRecording ? recordingStatus : processingStatus;

  return (
    <Container size="lg" mt="xl">
      <Paper shadow="sm" radius="md" p="xl" withBorder>
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <Title order={2}>Audio Session Recorder</Title>
            <Group>
              <Text size="sm" c="dimmed">Session Type:</Text>
              <SegmentedControl
                size="sm"
                data={[
                  { label: 'In-Person', value: 'inPerson' },
                  { label: 'Telehealth', value: 'telehealth' }
                ]}
                value={isTelehealth ? 'telehealth' : 'inPerson'}
                onChange={(value) => setIsTelehealth(value === 'telehealth')}
                disabled={isRecording || isTranscribing || isGeneratingNote}
              />
            </Group>
          </Group>
        
          <Stack gap="lg">
            <Stack gap="md">
              <PatientSelector 
                onSelect={(patient: Patient) => setSelectedPatient(patient)}
                initialPatient={selectedPatient}
                context="audio"
                disabled={isRecording || isTranscribing || isGeneratingNote}
              />
              {selectedPatient && (
                <Stack gap="xs">
                  <Select
                    label="Note Template"
                    placeholder="Select a template"
                    data={templates
                      .filter(t => t.type === 'progress')
                      .map(t => ({
                        value: t.id!,
                        label: t.name
                      }))}
                    value={selectedTemplate?.id}
                    onChange={(value) => {
                      const template = templates.find(t => t.id === value);
                      setSelectedTemplate(template);
                    }}
                    style={{ maxWidth: '400px' }}
                    disabled={isRecording || isTranscribing || isGeneratingNote}
                  />
                </Stack>
              )}
            </Stack>
            
            <AudioControls
              isRecording={isRecording}
              isPaused={isPaused}
              isBlinking={isBlinking}
              hasTranscript={!!transcript}
              hasAudioBlob={!!audioBlob}
              status={displayStatus}
              disabled={!selectedPatient || isTranscribing || isGeneratingNote}
              isTranscribing={isTranscribing}
              isGeneratingNote={isGeneratingNote}
              onStartRecording={handleStartRecording}
              onStopRecording={stopRecording}
              onPauseRecording={pauseRecording}
              onResumeRecording={resumeRecording}
              onCancelRecording={cancelRecording}
              onPlayAudio={playAudio}
              onTranscribeAudio={handleTranscribeAudio}
              onGenerateNote={handleGenerateNote}
            />

            {(isTranscribing || isGeneratingNote) && (
              <Paper p="md" withBorder bg="gray.0">
                <Stack gap="xs">
                  <Group>
                    <Loader size="sm" />
                    <Text size="sm">
                      {isTranscribing ? 'Transcribing audio...' : 'Generating note...'}
                    </Text>
                  </Group>
                  {isTranscribing && uploadProgress > 0 && (
                    <Progress 
                      value={uploadProgress} 
                      size="sm" 
                      color={uploadProgress === 100 ? 'green' : 'blue'}
                    />
                  )}
                </Stack>
              </Paper>
            )}

            <TranscriptionView 
              transcript={transcript}
              psychNote={psychNote}
            />
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}