import { Box, Button, Container, Group, Text, Title, Modal, TextInput, Stack, ActionIcon, Paper, Divider, Switch, Select, Loader, Progress, SegmentedControl, SegmentedControlItem, Tooltip, Center, AppShell } from '@mantine/core';
import { IconPlayerRecord, IconPlayerStop, IconPlayerPlay, IconFileText, IconNotes, IconPlayerPause, IconPlus, IconCheck, IconX, IconLoader, IconMicrophone, IconHeadphones, IconCircle1, IconCircle2, IconCircle3, IconArrowRight, IconArrowLeft } from '@tabler/icons-react';
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
import { useProfileUsage } from '../hooks/useProfileUsage';
import { useAudioDevices } from '../hooks/useAudioDevices';
import { useOnboarding } from '../hooks/useOnboarding';

interface OnboardingPageProps {
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

interface DialogLine {
  speaker: 'Clinician' | 'Client';
  text: string;
}

const sampleDialog: DialogLine[] = [
  { speaker: 'Clinician', text: 'Hi there, how have you been since we last met?' },
  { speaker: 'Client', text: "The anxiety has been pretty intense, especially at work. I've been having trouble focusing." },
  { speaker: 'Clinician', text: 'Can you tell me more about what happens when you feel anxious at work?' },
  { speaker: 'Client', text: "My heart starts racing, and I keep second-guessing every decision. I'm worried I'll make a mistake." },
  { speaker: 'Clinician', text: "Let's work on some coping strategies you can use in those moments. Would you be open to trying a brief grounding exercise now?" },
  { speaker: 'Client', text: "Yes, I'd like that. I need something I can use when I start feeling overwhelmed." }
];

export function OnboardingPage({ 
  onTranscriptionStart, 
  onCompositionSaved, 
  onTranscriptionEnd,
  onGeneratingStart,
  onGeneratingEnd 
}: OnboardingPageProps): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();
  const { templates } = useTemplates();
  const { incrementUsage } = useProfileUsage();
  const [selectedPatient, setSelectedPatient] = useState<Patient>();
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate>();
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [displayedLines, setDisplayedLines] = useState<DialogLine[]>([]);
  const [savedComposition, setSavedComposition] = useState<Composition>();
  const [isStartButtonHovered, setIsStartButtonHovered] = useState(false);
  const [isTelehealth] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const { hasCompletedOnboarding, completeOnboarding } = useOnboarding();
  const [showDialog, setShowDialog] = useState(false);

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
  } = useAudioRecording();

  const {
    transcript,
    psychNote,
    status: processingStatus,
    transcribeAudio: handleTranscribeAudio,
    generateNote,
    setPsychNote
  } = useTranscription();

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);

  const { audioDevices } = useAudioDevices();
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  // Initialize selectedTemplate with Follow-up Therapy
  useEffect(() => {
    const followUpTemplate = templates.find(t => t.name === 'Follow-up Therapy');
    if (followUpTemplate) {
      setSelectedTemplate(followUpTemplate);
      console.log('Set default template:', followUpTemplate.name); // Debug log
    }
  }, [templates]);

  // Create and select Test Patient on mount
  useEffect(() => {
    let isSubscribed = true;  // Add this flag
    
    const setupTestPatient = async () => {
      try {
        const existingPatients = await medplum.searchResources('Patient', 'name=Sample Client');
        
        if (existingPatients.length > 0) {
          console.log('Using existing Sample Client:', existingPatients[0].id);
          setSelectedPatient(existingPatients[0]);
          if (isSubscribed) {  // Only show notification if component is still mounted
            showNotification({
              title: 'Info',
              message: 'Using existing Sample Client',
              color: 'blue'
            });
          }
          return;
        }

        console.log('Creating Sample Client...');
        const testPatient = await medplum.createResource({
          resourceType: 'Patient',
          name: [{
            given: ['Sample'],
            family: 'Client'
          }]
        });
        console.log('Sample Client created:', testPatient.id);
        if (isSubscribed) {  // Only show notification if component is still mounted
          setSelectedPatient(testPatient);
          showNotification({
            title: 'Success', 
            message: 'Sample Client created and selected',
            color: 'green'
          });
        }
      } catch (error) {
        console.error('Error setting up Sample Client:', error);
        if (isSubscribed) {  // Only show notification if component is still mounted
          showNotification({
            title: 'Error',
            message: 'Failed to set up Sample Client',
            color: 'red'
          });
        }
      }
    };

    setupTestPatient();
    
    return () => {
      isSubscribed = false;  // Cleanup function to prevent notifications after unmount
    };
  }, [medplum]);

  // Remove the progressive display effect
  useEffect(() => {
    if (isSessionStarted) {
      setDisplayedLines(sampleDialog);
    }
  }, [isSessionStarted]);

  // Add these useEffects for template handling
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

  // Add location state handling for default template
  const location = useLocation();
  useEffect(() => {
    const defaultTemplateId = location.state?.defaultTemplate;
    if (defaultTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === defaultTemplateId);
      setSelectedTemplate(template);
    }
  }, [location.state, templates]);

  const handleStartSession = async () => {
    try {
      if (!selectedPatient) {
        throw new Error('Please select a patient first');
      }
      /* if (!selectedTemplate) {
        throw new Error('Please select a template first');
      } */

      // Get the practitioner profile
      const profile = await medplum.getProfile();
      const practitionerName = profile.name?.[0] ? 
        `${profile.name[0].given?.[0] || ''} ${profile.name[0].family || ''}`.trim() : 
        'Unknown Practitioner';

      // Create initial composition - FIRST TRIGGER POINT
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
        title: 'Progress Notes',
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

      const composition = await medplum.createResource(initialComposition);
      setSavedComposition(composition);
      
      // CRITICAL: First trigger to App.tsx
      onCompositionSaved?.();
      
      setIsSessionStarted(true);
      await startRecording();
      setOnboardingStep(1);

    } catch (error) {
      console.error('Error starting session:', error);
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to start session',
        color: 'red'
      });
    }
  };

  const handleFullWorkflow = async () => {
    try {
      console.log('Starting full workflow...');
      
      const blob = await stopRecording();
      console.log('Recording stopped, blob available:', blob);
      setIsSessionStarted(false);  // Add this line to hide controls

      
      // SECOND TRIGGER POINT - Transcription Start
      setIsTranscribing(true);
      if (savedComposition?.id) {
        onTranscriptionStart?.(savedComposition.id);
        onCompositionSaved?.(); // Update list with transcribing status
      }
      
      setOnboardingStep(2);
      const transcriptText = await handleTranscribeAudio(blob, savedComposition?.id);
      
      if (!transcriptText) {
        throw new Error('No transcript was generated');
      }
      
      // THIRD TRIGGER POINT - Transcription End
      setIsTranscribing(false);
      onTranscriptionEnd?.();
      onCompositionSaved?.(); // Update list after transcription
      
      console.log('Generating note...');
      setIsGeneratingNote(true);
      if (savedComposition?.id) {
        onGeneratingStart?.(savedComposition.id);
      }
      
      try {
        await generateNote(transcriptText, selectedPatient!, selectedTemplate!, savedComposition!.id);
        console.log('Note generation complete');
        
        await incrementUsage();
        onCompositionSaved?.();
        
        // Mark onboarding as complete
        await handleCompleteOnboarding();
        
        setOnboardingStep(3);
      } finally {
        setIsGeneratingNote(false);
        if (savedComposition?.id) {
          onGeneratingEnd?.(savedComposition.id);
        }
      }
    } catch (error) {
      console.error('Error in handleFullWorkflow:', error);
      showNotification({
        title: 'Error',
        message: 'An error occurred during the workflow',
        color: 'red'
      });
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      await completeOnboarding();
      showNotification({
        title: '🎉 Congratulations!',
        message: 'You\'ve completed onboarding! Click on your newly created note in the left sidebar to see your progress note.',
        color: 'green',
        autoClose: false
      });
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to save onboarding status',
        color: 'red'
      });
    }
  };

  return (
    <AppShell
      navbar={{
        width: 300,
        collapsed: false,
        breakpoint: 'sm',
        collapsible: false
      }}
    >
      <Container size="sm" mt="xl">
        <Paper p={40} radius="md" withBorder>
          <Stack gap="xl">
            {/* Welcome Message */}
            <Group align="flex-start" gap="md">
              <IconCircle1 size={24} style={{ minWidth: 24 }} />
              <Stack gap="xs">
                <Title order={2}>Welcome to Progress Notes!</Title>
                <Text c="dimmed">
                  Try out Progress Notes with a practice session. Click 'Start session', allow microphone access when prompted in the upper left window, 
                  and we'll guide you through the rest.
                </Text>
              </Stack>
            </Group>

            {/* Onboarding Progress */}
            <Paper p="md" mb="xl" withBorder>
              <Stack gap="xs">
                <Group position="apart">
                  <Text size="sm" fw={500}>Onboarding Progress</Text>
                  <Text size="sm" c="dimmed">{Math.round((onboardingStep / 3) * 100)}%</Text>
                </Group>
                <Progress
                  value={(onboardingStep / 3) * 100}
                  size="md"
                  radius="xl"
                  color={onboardingStep === 3 ? 'green' : 'blue'}
                />
                <Text size="xs" c="dimmed">
                  {onboardingStep === 0 && 'Step 1: See Example Dialog'}
                  {onboardingStep === 1 && 'Step 2: Record session'}
                  {onboardingStep === 2 && 'Step 3: Generate note'}
                  {onboardingStep === 3 && 'Complete!'}
                </Text>
              </Stack>
            </Paper>

            {/* Main Content */}
            <Stack gap="md">
              {!isSessionStarted ? (
                <>
                  {/* Next button to reveal dialog */}
                  {!showDialog && (
                    <Button
                      variant="light"
                      color="blue"
                      size="md"
                      rightSection={<IconArrowRight size={16} />}
                      onClick={() => setShowDialog(true)}
                      mx="auto"
                    >
                      See Example Dialog
                    </Button>
                  )}

                  {/* Dialog content */}
                  {showDialog && (
                    <Stack gap="md">
                      <Text fw={500}>Click 'Start Session' and please read the clinician and client parts out loud</Text>
                      {displayedLines.map((line, index) => (
                        <Box key={index}>
                          <Text fw={500}>{line.speaker}:</Text>
                          <Text>{line.text}</Text>
                        </Box>
                      ))}
                    </Stack>
                  )}

                  {/* Start Session button - hidden during transcription/generation */}
                  <Button
                    size="xl"
                    radius="xl"
                    color={isTelehealth ? 'teal' : 'blue.9'}
                    leftSection={hasCompletedOnboarding ? <IconArrowLeft size={20} /> : (isTelehealth ? <IconHeadphones size={20} /> : <IconMicrophone size={20} />)}
                    onClick={handleStartSession}
                    disabled={!showDialog || isTranscribing || isGeneratingNote || hasCompletedOnboarding}
                    styles={{
                      inner: {
                        fontSize: '18px',
                        fontWeight: 500,
                        height: '52px'
                      },
                      root: {
                        width: '100%',
                        opacity: (!showDialog || isTranscribing || isGeneratingNote) ? 0.5 : 1,
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
                        }
                      }
                    }}
                  >
                    {hasCompletedOnboarding 
                      ? "Click your note in the left sidebar to view it" 
                      : "Start session"}
                  </Button>
                </>
              ) : (
                <>
                  {/* Sample Dialog Display */}
                  <Stack gap="md">
                    <Text fw={500}>Click 'Start Session' and please read the clinician and client parts out loud</Text>
                    {displayedLines.map((line, index) => (
                      <Box key={index}>
                        <Text fw={500}>{line.speaker}:</Text>
                        <Text>{line.text}</Text>
                      </Box>
                    ))}
                    {displayedLines.length === sampleDialog.length && (
                      <Text fw={500} c="dimmed">Press 'End session' and let the magic happen</Text>
                    )}
                  </Stack>

                  {/* Recording Controls */}
                  <Box 
                    style={{ 
                      height: '52px',
                      width: '340px',
                      margin: '0 auto'
                    }}
                  >
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
                        onClick={cancelRecording}
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
                  </Box>

                  {isRecording && (
                    <>
                      <AudioMeter 
                        stream={stream} 
                        isRecording={isRecording}
                        isPaused={isPaused}
                      />
                      <Group align="center" spacing="xs" style={{ maxWidth: '100%', margin: '0 auto' }}>
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
                            },
                            item: {
                              '&[data-selected]': {
                                backgroundColor: '#cfd8dc',
                                color: 'black',
                              },
                              '&[data-hovered]': {
                                backgroundColor: '#f5f5f5',
                              }
                            }
                          }}
                        />
                      </Group>
                    </>
                  )}

                  {/* Transcription View */}
                  {(transcript || psychNote) && (
                    <TranscriptionView
                      transcript={transcript}
                      psychNote={psychNote}
                      status={processingStatus}
                    />
                  )}

                  
                </>
              )}
              {(isTranscribing || isGeneratingNote) && (
                <Paper p="md" withBorder bg="gray.0">
                  <Stack gap="xs">
                    <Group>
                      <Loader size="sm" />
                      <Text size="sm">
                        {isTranscribing ? 'Transcribing audio...' : 'Generating note...'}
                      </Text>
                    </Group>
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </AppShell>
  );
}