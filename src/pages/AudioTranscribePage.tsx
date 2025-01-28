import { Box, Button, Container, Group, Text, Title, Modal, TextInput, Stack, ActionIcon, Paper, Divider, Switch, Select, Loader, Progress, SegmentedControl, SegmentedControlItem } from '@mantine/core';
import { IconPlayerRecord, IconPlayerStop, IconPlayerPlay, IconFileText, IconNotes, IconPlayerPause, IconPlus, IconCheck, IconX, IconLoader, IconMicrophone, IconHeadphones } from '@tabler/icons-react';
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
import { AudioMeter } from '../components/audio/AudioMeter';

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
  onGenerateNote: () => void;
}

// Define the data with correct type
const sessionTypeData: SegmentedControlItem[] = [
  { value: 'inperson', label: 'No Headphones' },
  { value: 'telehealth', label: 'Headphones' }
];

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
    stream,
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
  const [showCancelModal, setShowCancelModal] = useState(false);

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
    console.log('handleStartRecording called', {
      hasSelectedPatient: !!selectedPatient,
      isTelehealth
    });

    if (!selectedPatient) {
      console.log('No patient selected, showing notification');
      showNotification({
        title: 'Select a Patient',
        message: 'Please select a patient to start the session',
        icon: <IconMicrophone size={16} />,
        color: 'blue',
        autoClose: 4000
      });
      return;
    }

    console.log('Patient selected, proceeding with recording');
    try {
      // Create initial composition before starting recording
      await createInitialComposition(selectedPatient, selectedTemplate);
      onCompositionSaved?.();

      await startRecording(isTelehealth);
    } catch (err) {
      console.error('Error in handleStartRecording:', err);
      showNotification({
        title: 'Error',
        message: 'Could not start recording',
        color: 'red'
      });
    }
  };

  const handleTranscribeAudio = async (providedBlob?: Blob) => {
    const blobToUse = providedBlob || audioBlob;
    if (!blobToUse) {
      console.log('No audioBlob available for transcription');
      return;
    }
    
    // Ensure we have a proper Blob with arrayBuffer method
    const blob = blobToUse instanceof Blob ? blobToUse : new Blob([blobToUse], { type: 'audio/webm' });
    
    if (!savedComposition?.id) {
      console.log('No composition ID available for transcription');
      showNotification({
        title: 'Error',
        message: 'No active session found. Please start a new recording.',
        color: 'red'
      });
      return;
    }
    
    console.log('Starting transcription process:', {
      blobSize: blob.size,
      blobType: blob.type,
      compositionId: savedComposition.id
    });
    
    setIsTranscribing(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      console.log('Calling transcribeAudio...');
      const transcriptText = await transcribeAudio(blob, savedComposition.id, onTranscriptionStart);
      console.log('transcribeAudio completed successfully, transcript length:', transcriptText.length);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      showNotification({
        title: 'Success',
        message: 'Audio transcribed successfully',
        color: 'green'
      });

      return transcriptText;
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
    console.log('handleGenerateNote called with:', {
      hasTranscript: !!transcript,
      transcriptLength: transcript?.length,
      hasPatient: !!selectedPatient,
      hasTemplate: !!selectedTemplate,
      compositionId: savedComposition?.id
    });

    if (!transcript) {
      console.log('No transcript available for note generation');
      return;
    }
    
    if (!savedComposition?.id) {
      console.log('No composition ID available for note generation');
      showNotification({
        title: 'Error',
        message: 'No active session found. Please start a new recording.',
        color: 'red'
      });
      return;
    }
    
    setIsGeneratingNote(true);
    try {
      console.log('Starting note generation...');
      await generateNote(transcript, selectedPatient, selectedTemplate, savedComposition.id);
      console.log('Note generation completed successfully');
      
      showNotification({
        title: 'Success',
        message: 'Note generated and saved successfully',
        color: 'green'
      });
    } catch (err) {
      console.error('Note generation error:', err);
      showNotification({
        title: 'Error',
        message: 'Failed to generate note',
        color: 'red'
      });
    } finally {
      setIsGeneratingNote(false);
    }
  };

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    try {
      // Delete the composition if it exists
      if (savedComposition?.id) {
        await medplum.deleteResource('Composition', savedComposition.id);
        // Notify App.tsx that compositions list needs to be updated
        onCompositionSaved?.();
      }
      
      // Cancel the recording and close modal
      cancelRecording();
      setShowCancelModal(false);

      showNotification({
        title: 'Session Canceled',
        message: 'The session has been discarded',
        color: 'gray'
      });
    } catch (err) {
      console.error('Error deleting composition:', err);
      showNotification({
        title: 'Error',
        message: 'Failed to delete the session completely',
        color: 'red'
      });
    }
  };

  const handleFullWorkflow = async () => {
    try {
      console.log('Starting full workflow...');
      
      // Stop recording and wait for the blob
      console.log('Stopping recording...');
      const blob = await stopRecording();
      console.log('Recording stopped, blob available:', blob);
      
      // Start transcription with the blob we just got
      console.log('Starting transcription...');
      const transcriptText = await handleTranscribeAudio(blob);
      console.log('Transcription complete, transcript received:', !!transcriptText);
      
      if (!transcriptText) {
        throw new Error('No transcript was generated');
      }
      
      // Generate note using the transcript we just got
      console.log('Generating note...');
      await generateNote(transcriptText, selectedPatient, selectedTemplate, savedComposition!.id);
      console.log('Note generation complete');
      
      showNotification({
        title: 'Success',
        message: 'Session ended and note generated successfully',
        color: 'green'
      });
    } catch (error) {
      console.error('Error in workflow:', error);
      showNotification({
        title: 'Error',
        message: error instanceof Error ? error.message : 'An error occurred during the workflow',
        color: 'red'
      });
    }
  };

  // Combine recording status and processing status
  const displayStatus = isRecording ? recordingStatus : processingStatus;

  return (
    <Container size="sm" mt="xl">
      <Modal 
        opened={showCancelModal} 
        onClose={() => setShowCancelModal(false)}
        title="Are you sure you want to cancel this session?"
        centered
        size="md"
      >
        <Stack>
          <Group gap="xs">
            <IconX size={20} style={{ color: 'var(--mantine-color-gray-5)' }} />
            <Text c="dimmed" size="sm">Once the session is canceled, it won't be able to be restored.</Text>
          </Group>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setShowCancelModal(false)}>
              Back
            </Button>
            <Button color="red" onClick={handleConfirmCancel}>
              Discard
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Paper p={40} radius="md" withBorder>
        <Stack gap="xl">
          <Group justify="space-between" align="center">
            <Switch
              size="md"
              color="teal"
              checked={isTelehealth}
              onChange={(event) => setIsTelehealth(event.currentTarget.checked)}
              label={
                <Text size="sm" c={isTelehealth ? 'dark' : 'dimmed'}>
                  Use headphones
                </Text>
              }
            />
          </Group>
        
          <Stack gap="lg">
            <PatientSelector 
              onSelect={(patient: Patient) => setSelectedPatient(patient)}
              initialPatient={selectedPatient}
              context="audio"
              disabled={isRecording || isTranscribing || isGeneratingNote}
              styles={{
                root: { maxWidth: '100%' },
                input: {
                  height: '45px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  '&::placeholder': {
                    color: '#999'
                  }
                }
              }}
            />

            {selectedPatient && (
              <Select
                label="Format"
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
                styles={{
                  root: { maxWidth: '100%' },
                  input: {
                    height: '45px',
                    fontSize: '16px'
                  }
                }}
                disabled={isRecording || isTranscribing || isGeneratingNote}
              />
            )}

            <Box 
              style={{ 
                height: '52px',
                width: '340px',
                margin: '0 auto'
              }}
            >
              {!isRecording ? (
                <Button
                  size="xl"
                  radius="xl"
                  color={isTelehealth ? 'teal' : 'blue.9'}
                  leftSection={isTelehealth ? <IconHeadphones size={20} /> : <IconMicrophone size={20} />}
                  onClick={handleStartRecording}
                  styles={{
                    inner: {
                      fontSize: '18px',
                      fontWeight: 500,
                      height: '52px'
                    },
                    root: {
                      width: '100%',
                      background: isTelehealth 
                        ? 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)' 
                        : 'linear-gradient(135deg, #2C5282 0%, #3B82B6 100%)',
                      boxShadow: isTelehealth
                        ? '0 4px 15px rgba(15, 118, 110, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                        : '0 4px 15px rgba(44, 82, 130, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        background: isTelehealth
                          ? 'linear-gradient(135deg, #0D6D6B 0%, #0F9B8E 100%)'
                          : 'linear-gradient(135deg, #234876 0%, #2D6899 100%)',
                        boxShadow: isTelehealth
                          ? '0 6px 20px rgba(15, 118, 110, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                          : '0 6px 20px rgba(44, 82, 130, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                        boxShadow: isTelehealth
                          ? '0 2px 10px rgba(15, 118, 110, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                          : '0 2px 10px rgba(44, 82, 130, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                      }
                    }
                  }}
                >
                  Start session
                </Button>
              ) : (
                <Group 
                  justify="center" 
                  style={{ 
                    width: '100%',
                    gap: '16px',
                    opacity: 1,
                    transform: 'translateY(0)'
                  }}
                >
                  <Button
                    variant="outline"
                    color="blue"
                    radius="xl"
                    size="lg"
                    leftSection={<IconMicrophone size={20} />}
                    onClick={handleFullWorkflow}
                    style={{ 
                      flex: 1,
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                      }
                    }}
                  >
                    End session
                  </Button>
                  <Box
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#fa5252',
                      opacity: isBlinking && !isPaused ? 1 : 0.3
                    }}
                  />
                  <ActionIcon 
                    variant="light" 
                    color="gray" 
                    size="xl" 
                    radius="xl"
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    style={{
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                      }
                    }}
                  >
                    {isPaused ? <IconPlayerPlay size={20} /> : <IconPlayerPause size={20} />}
                  </ActionIcon>
                  <ActionIcon 
                    variant="light" 
                    color="red" 
                    size="xl" 
                    radius="xl"
                    onClick={handleCancelClick}
                    style={{
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                      }
                    }}
                  >
                    <IconX size={20} />
                  </ActionIcon>
                </Group>
              )}
            </Box>

            {isRecording && (
              <AudioMeter 
                stream={stream} 
                isRecording={isRecording}
                isPaused={isPaused}
              />
            )}
          </Stack>

          <Stack gap="sm">
            <AudioControls
              isRecording={isRecording}
              isPaused={isPaused}
              isBlinking={isBlinking}
              hasTranscript={!!transcript}
              hasAudioBlob={!!audioBlob}
              status={displayStatus}
              isTranscribing={isTranscribing}
              isGeneratingNote={isGeneratingNote}
              onStartRecording={handleStartRecording}
              onStopRecording={stopRecording}
              onPauseRecording={pauseRecording}
              onResumeRecording={resumeRecording}
              onCancelRecording={cancelRecording}
              onPlayAudio={playAudio}
              onGenerateNote={handleGenerateNote}
            />
          </Stack>

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

          {/* Display prompt for debugging */}
          {psychNote?.prompt && (
            <Paper p="md" withBorder bg="gray.0">
              <Stack gap="xs">
                <Title order={4}>Debug: Prompt sent to Claude</Title>
                <Box 
                  style={{ 
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    padding: '8px',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  {psychNote.prompt}
                </Box>
              </Stack>
            </Paper>
          )}

          {/* Display raw response for debugging */}
          {psychNote?.rawResponse && (
            <Paper p="md" withBorder bg="gray.0">
              <Stack gap="xs">
                <Title order={4}>Debug: Raw Response from Claude</Title>
                <Box 
                  style={{ 
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    padding: '8px',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  {psychNote.rawResponse}
                </Box>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}