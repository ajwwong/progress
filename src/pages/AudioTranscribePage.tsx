import { Box, Button, Container, Group, Text, Title, Modal, TextInput, Stack, ActionIcon, Paper, Divider, Switch, Select, Loader, Progress, SegmentedControl, SegmentedControlItem, Tooltip, Alert } from '@mantine/core';
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
import { useOrganizationUsage } from '../hooks/useOrganizationUsage';
import { useAudioDevices } from '../hooks/useAudioDevices';
import { useBeforeUnload } from '../hooks/useBeforeUnload';

interface AudioTranscribePageProps {
  onTranscriptionStart?: (compositionId: string) => void;
  onCompositionSaved?: () => void;
  onTranscriptionEnd?: () => void;
  onGeneratingStart?: (compositionId: string) => void;
  onGeneratingEnd?: (compositionId: string) => void;
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

// Add this type guard function
const ensureCompositionId = (composition?: { id?: string }): string => {
  if (!composition?.id) {
    throw new Error('No composition ID found');
  }
  return composition.id;
};

export function AudioTranscribePage({ onTranscriptionStart, onCompositionSaved, onTranscriptionEnd, onGeneratingStart, onGeneratingEnd }: AudioTranscribePageProps): JSX.Element {
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
  const [isStartButtonHovered, setIsStartButtonHovered] = useState(false);
  const { usageData, incrementUsage, canUseSession } = useOrganizationUsage();
  const { audioDevices, selectedDevice, setSelectedDevice } = useAudioDevices();
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Set initial values from location state
  useEffect(() => {
    if (location.state?.selectedPatient) {
      setSelectedPatient(location.state.selectedPatient);
    }
  }, [location.state]);

  // Load default template when templates are available
  useEffect(() => {
    const loadDefaultTemplate = async () => {
      console.log('Loading default template. Templates available:', templates.length);
      
      // First check if we have a template from navigation state
      const defaultTemplateId = location.state?.defaultTemplate;
      if (defaultTemplateId && templates.length > 0) {
        const template = templates.find(t => t.id === defaultTemplateId);
        if (template) {
          console.log('Using template from navigation:', template.name);
          setSelectedTemplate(template);
          return;
        }
      }
      
      // Next, check if practitioner has a default template preference
      try {
        const practitioner = await medplum.getProfile() as Practitioner;
        const practitionerDefaultTemplateId = practitioner?.extension?.find(
          ext => ext.url === 'https://progress.care/fhir/default-template'
        )?.valueString;
        
        if (practitionerDefaultTemplateId && templates.length > 0) {
          const template = templates.find(t => t.id === practitionerDefaultTemplateId);
          if (template) {
            console.log('Using practitioner default template:', template.name);
            setSelectedTemplate(template);
            return;
          }
        }
      } catch (err) {
        console.error('Error loading practitioner default template:', err);
      }
      
      // If no template was selected and we have templates available, use the first one
      if (!selectedTemplate && templates.length > 0) {
        console.log('Using first available template as default:', templates[0].name);
        setSelectedTemplate(templates[0]);
      }
    };

    loadDefaultTemplate();
  }, [templates, location.state, selectedTemplate, medplum]);

  const handleStartRecording = async () => {
    if (!canUseSession) {
      showNotification({
        title: 'Session Limit Reached',
        message: 'You have used all your free sessions this month. Upgrade your account to continue.',
        color: 'yellow',
        icon: <IconX size={16} />,
      });
      return;
    }

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

      if (savedComposition?.id) {
        onTranscriptionStart?.(savedComposition.id);
      }

      console.log('Calling transcribeAudio...');
      const transcriptText = await transcribeAudio(blob, savedComposition.id);
      console.log('transcribeAudio completed successfully, transcript length:', transcriptText.length);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      showNotification({
        title: 'Success',
        message: 'Audio transcribed successfully',
        color: 'green'
      });

      onTranscriptionEnd?.();
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
    if (savedComposition?.id) {
      onGeneratingStart?.(savedComposition.id);
    }
    try {
      console.log('Starting note generation...');
      const transcriptText = await generateNote(
        transcript, 
        selectedPatient, 
        selectedTemplate, 
        ensureCompositionId(savedComposition)
      );
      console.log('Note generation completed successfully');
      
      await incrementUsage();
            
      setIsCompleted(true);
      
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
      if (savedComposition?.id) {
        onGeneratingEnd?.(savedComposition.id);
      }
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
      setIsGeneratingNote(true);
      if (savedComposition?.id) {
        onGeneratingStart?.(savedComposition.id);
      }
      try {
        await generateNote(
          transcriptText, 
          selectedPatient, 
          selectedTemplate, 
          ensureCompositionId(savedComposition)
        );
        console.log('Note generation complete');
        
        await incrementUsage();
        
        setIsCompleted(true);        

        showNotification({
          title: 'Success',
          message: 'Session ended and note generated successfully',
          color: 'green'
        });
      } finally {
        setIsGeneratingNote(false);
        if (savedComposition?.id) {
          onGeneratingEnd?.(savedComposition.id);
        }
      }
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

  const isProcessing = processingStatus === 'Transcribing...' || isGeneratingNote;
  useBeforeUnload(isProcessing, 'Audio is still being processed. Are you sure you want to leave?');
  const openNewSession = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('new', 'true');
    window.open(url.toString(), '_blank');
  };

/* useEffect(() => {
    if (onGeneratingEnd) {
      onGeneratingEnd(savedComposition?.id || '');
    }
  }, [onGeneratingEnd]);*/

  return (
    <Container size="sm" mt="xl">
      <Group justify="right" mb="md" style={{ opacity: isRecording ? 0.5 : 1 }}>
        <Tooltip 
          label={`${usageData.sessionsUsed} of ${usageData.sessionsLimit} sessions used this month`}
          position="bottom"
          withArrow
        >
          <Text 
            size="sm" 
            c={usageData.sessionsUsed >= usageData.sessionsLimit ? (usageData.subscriptionStatus === 'active' ? 'yellow' : 'red') : 'dimmed'} 
            style={{ fontSize: '13px' }}
          >
            {usageData.sessionsUsed >= usageData.sessionsLimit ? (
              usageData.subscriptionStatus === 'active' ? (
                <Alert color="yellow" mb="md">
                  You've used all your sessions for this month. Since you're on an active subscription, 
                  you can continue using the service and will be billed for additional sessions.
                </Alert>
              ) : (
                <Alert color="red" mb="md">
                  You've reached your session limit. Please upgrade your plan to continue.
                </Alert>
              )
            ) : (
              `${usageData.sessionsLimit - usageData.sessionsUsed} sessions remaining`
            )}
          </Text>
        </Tooltip>
        {usageData.subscriptionStatus !== 'active' && (
          <Button
            variant="subtle"
            size="xs"
            color="blue"
            onClick={() => navigate('/settings/subscription', { 
              state: { defaultTab: 'billing' }
            })}
            px={8}
            style={{ 
              fontSize: '13px',
              height: '22px',
              padding: '0 8px'
            }}
          >
            Upgrade
          </Button>
        )}
      </Group>

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
              color="teal.6"
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
              isHighlighted={isStartButtonHovered && !selectedPatient}
            />

            {selectedPatient && (
              <Select
                label="Format"
                placeholder="Select a template"
                data={templates.map(t => ({
                  value: t.id || '',
                  label: t.name || 'Untitled Template'
                }))}
                value={selectedTemplate?.id}
                onChange={(value) => {
                  const template = templates.find(t => t.id === value);
                  setSelectedTemplate(template);
                }}
                styles={(theme) => ({
                  root: { maxWidth: '100%' },
                  input: {
                    height: '45px',
                    fontSize: '16px'
                  }
                })}
                disabled={isRecording || isTranscribing || isGeneratingNote}
              />
            )}

            <Box 
              style={{ 
                height: '56px',
                width: '100%',
                margin: '0 auto'
              }}
            >
              {isCompleted ? (
                <Button
                  variant="outline"
                  color="green.6"
                  size="xl"
                  radius="lg"
                  leftSection={<IconCheck size={22} />}
                  onClick={openNewSession}
                  styles={{
                    root: {
                      width: '100%',
                      height: '56px',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      background: 'linear-gradient(165deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.12) 100%)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 8px 16px rgba(34, 197, 94, 0.15), 0 4px 8px rgba(34, 197, 94, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        background: 'linear-gradient(165deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.16) 100%)',
                        boxShadow: '0 20px 40px rgba(34, 197, 94, 0.25), 0 8px 16px rgba(34, 197, 94, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      }
                    },
                    inner: {
                      fontSize: '17px',
                      fontWeight: 500,
                      letterSpacing: '0.3px'
                    }
                  }}
                >
                  Note Generated - Start New Session
                </Button>
              ) : (!isRecording && !isTranscribing && !isGeneratingNote) ? (
                <Button
                  size="xl"
                  radius="lg"
                  variant={isTelehealth ? 'outline' : 'outline'}
                  color={isTelehealth ? 'teal.6' : 'blue.6'}
                  leftSection={isTelehealth ? <IconHeadphones size={22} /> : <IconPlus size={22} />}
                  onClick={handleStartRecording}
                  onMouseEnter={() => setIsStartButtonHovered(true)}
                  onMouseLeave={() => setIsStartButtonHovered(false)}
                  styles={{
                    inner: {
                      fontSize: '17px',
                      fontWeight: 500,
                      height: '56px',
                      letterSpacing: '0.3px',
                      padding: '0 28px',
                      color: isTelehealth ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-blue-6)'
                    },
                    root: {
                      width: '100%',
                      background: isTelehealth 
                        ? 'linear-gradient(165deg, rgba(20, 184, 166, 0.08) 0%, rgba(20, 184, 166, 0.12) 100%)' 
                        : 'linear-gradient(165deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.12) 100%)',
                      border: isTelehealth 
                        ? '1px solid rgba(20, 184, 166, 0.3)'
                        : '1px solid rgba(37, 99, 235, 0.3)',
                      backdropFilter: 'blur(8px)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isTelehealth
                        ? '0 8px 16px rgba(20, 184, 166, 0.15), 0 4px 8px rgba(20, 184, 166, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                        : '0 8px 16px rgba(37, 99, 235, 0.15), 0 4px 8px rgba(37, 99, 235, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        background: isTelehealth
                          ? 'linear-gradient(165deg, rgba(20, 184, 166, 0.12) 0%, rgba(20, 184, 166, 0.16) 100%)'
                          : 'linear-gradient(165deg, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0.16) 100%)',
                        boxShadow: isTelehealth
                          ? '0 20px 40px rgba(20, 184, 166, 0.25), 0 8px 16px rgba(20, 184, 166, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                          : '0 20px 40px rgba(37, 99, 235, 0.25), 0 8px 16px rgba(37, 99, 235, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      }
                    }
                  }}
                >
                  Start session
                </Button>
              ) : isRecording ? (
                <Group 
                  align="center" 
                  style={{ 
                    maxWidth: '100%', 
                    margin: '0 auto',
                    gap: 'var(--mantine-spacing-md)'
                  }}
                >
                  <Button
                    variant="outline"
                    color="blue.6"
                    radius="lg"
                    size="xl"
                    leftSection={<IconPlayerStop size={22} />}
                    onClick={handleFullWorkflow}
                    styles={{
                      root: {
                        flex: 1,
                        height: '56px',
                        border: '1px solid rgba(37, 99, 235, 0.3)',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 8px 16px rgba(37, 99, 235, 0.15), 0 4px 8px rgba(37, 99, 235, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          backgroundColor: 'rgba(37, 99, 235, 0.12)',
                          boxShadow: '0 20px 40px rgba(37, 99, 235, 0.25), 0 8px 16px rgba(37, 99, 235, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                        }
                      },
                      inner: {
                        fontSize: '17px',
                        fontWeight: 500,
                        letterSpacing: '0.3px'
                      }
                    }}
                  >
                    End session
                  </Button>

                  <Box
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#fa5252',
                      opacity: isBlinking && !isPaused ? 0.7 : 0.2,
                      transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 0 10px rgba(250, 82, 82, 0.15)'
                    }}
                  />

                  <ActionIcon 
                    variant="subtle"
                    color="gray" 
                    size={56}
                    radius="lg"
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    styles={{
                      root: {
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                        backgroundColor: 'white',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          backgroundColor: 'white',
                          border: '1px solid rgba(0, 0, 0, 0.18)',
                          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)'
                        }
                      }
                    }}
                  >
                    {isPaused ? <IconPlayerPlay size={22} /> : <IconPlayerPause size={22} />}
                  </ActionIcon>

                  <ActionIcon 
                    variant="subtle"
                    color="red.6" 
                    size={56}
                    radius="lg"
                    onClick={cancelRecording}
                    styles={{
                      root: {
                        border: '1px solid rgba(241, 79, 79, 0.15)',
                        backgroundColor: 'rgba(241, 79, 79, 0.03)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          backgroundColor: 'rgba(241, 79, 79, 0.05)',
                          boxShadow: '0 8px 20px rgba(241, 79, 79, 0.15)'
                        }
                      }
                    }}
                  >
                    <IconX size={22} />
                  </ActionIcon>
                </Group>
              ) : (isTranscribing || isGeneratingNote) ? (
                <Button
                  variant="outline"
                  color="blue.6"
                  size="xl"
                  radius="lg"
                  leftSection={<IconPlus size={22} />}
                  onClick={openNewSession}
                  styles={{
                    root: {
                      width: '100%',
                      height: '56px',
                      border: '1px solid rgba(37, 99, 235, 0.3)',
                      background: 'linear-gradient(165deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.12) 100%)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 8px 16px rgba(37, 99, 235, 0.15), 0 4px 8px rgba(37, 99, 235, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        background: 'linear-gradient(165deg, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0.16) 100%)',
                        boxShadow: '0 20px 40px rgba(37, 99, 235, 0.25), 0 8px 16px rgba(37, 99, 235, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      }
                    },
                    inner: {
                      fontSize: '17px',
                      fontWeight: 500,
                      letterSpacing: '0.3px'
                    }
                  }}
                >
                  Start New Recording
                </Button>
              ) : null}
            </Box>

            {isRecording && (
              <>
                <AudioMeter 
                  stream={stream} 
                  isRecording={isRecording}
                  isPaused={isPaused}
                />
                <Group align="center" style={{ maxWidth: '100%', margin: '0 auto' }}>
                  <Text size="sm" style={{ color: '#9e9e9e', fontSize: '14px' }}>Microphone</Text>
                  <Select
                    placeholder="Select a microphone"
                    data={audioDevices.map(device => ({
                      value: device.deviceId,
                      label: device.label || `Microphone ${device.deviceId}`
                    }))}
                    value={selectedDevice}
                    onChange={setSelectedDevice}
                    styles={{
                      input: {
                        height: '45px',
                        fontSize: '14px',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        boxShadow: 'none',
                        transition: 'border-color 0.2s ease',
                        color: '#757575',
                        '&::placeholder': {
                          color: '#bdbdbd',
                        },
                        '&:focus': {
                          borderColor: '#cfd8dc',
                          boxShadow: '0 0 0 2px rgba(207, 216, 220, 0.3)',
                        }
                      },
                      dropdown: {
                        borderRadius: '8px',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        '[data-selected]': {
                          backgroundColor: '#cfd8dc',
                          color: 'black',
                        },
                        '[data-hovered]': {
                          backgroundColor: '#f5f5f5',
                        }
                      }
                    }}
                  />
                </Group>
              </>
            )}
          </Stack>

          <Stack gap="sm">
           {/* <AudioControls
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
            />*/}
          </Stack>

          {(isTranscribing || isGeneratingNote) && (
            <Paper withBorder styles={(theme) => ({
              root: {
                padding: theme.spacing.md,
                backgroundColor: theme.colors.gray[0]
              }
            })}>
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

          {/*<TranscriptionView 
            transcript={transcript}
            psychNote={psychNote}
          />*/}

          {/* Display prompt for debugging */}
          {/*{psychNote?.prompt && (
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
          )}*/}

          {/* Display raw response for debugging */}
          {/*  {psychNote?.rawResponse && (
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
          )}*/}
        </Stack>
      </Paper>
    </Container>
  );
}