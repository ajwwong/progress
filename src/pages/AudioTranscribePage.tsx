import { Box, Button, Container, Group, Text, Title, Modal, TextInput, Stack, ActionIcon, Paper, Divider, SegmentedControl } from '@mantine/core';
import { IconPlayerRecord, IconPlayerStop, IconPlayerPlay, IconFileText, IconNotes, IconPlayerPause, IconPlus, IconCheck, IconX } from '@tabler/icons-react';
import { useState, useRef, useEffect, forwardRef } from 'react';
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

interface AudioTranscribePageProps {
  onTranscriptionStart?: (time: string) => void;
  onCompositionSaved?: () => void;
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
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>(
    useLocation().state?.selectedPatient
  );
  const navigate = useNavigate();
  const [isTelehealth, setIsTelehealth] = useState(true);

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

      const profile = await medplum.getProfile() as Practitioner;
      if (!profile) {
        throw new Error('No practitioner profile found');
      }

      const practitionerName = profile.name?.[0] ? 
        `${profile.name[0].given?.[0] || ''} ${profile.name[0].family || ''}`.trim() : 
        'Unknown Practitioner';

      const initialComposition: Composition = {
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
        title: 'Progress Note',
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
      setSavedComposition(savedComp as Composition);
      onCompositionSaved?.();

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
      const error = err as Error;
      console.error('Error starting recording:', error);
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
      onTranscriptionStart?.(timeString);
      
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
        
        const updatedComposition: Composition = {
          ...savedComposition,
          section: [{
            title: 'Transcript',
            text: {
              status: 'generated' as const,
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${response.details.transcript}</div>`
            }
          }]
        };

        const updated = await medplum.updateResource(updatedComposition);
        setSavedComposition(updated as Composition);
        setStatus('Transcription complete');
      } else {
        setStatus('Error: No transcript received');
      }
    } catch (err) {
      console.error('Error transcribing:', err);
      setStatus('Error: Transcription failed');

      // Update the composition with a dummy transcript
      if (savedComposition) {
        const dummyTranscript = "This is where the transcription would go";
        const updatedComposition: Composition = {
          ...savedComposition,
          section: [{
            title: 'Transcript',
            text: {
              status: 'generated' as const,
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${dummyTranscript}</div>`
            }
          }]
        };

        try {
          const updated = await medplum.updateResource(updatedComposition);
          setSavedComposition(updated as Composition);
          setTranscript(dummyTranscript);
          setStatus('Dummy transcript added');
        } catch (updateErr) {
          const error = updateErr as Error;
          console.error('Error updating composition with dummy transcript:', error);
        }
      }
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
          onTranscriptionStart?.(`${timeString} - ${selectedPatient?.name?.[0].given?.join(' ') || ''} ${selectedPatient?.name?.[0].family || ''}`);
          
          setStatus('Psychotherapy note generated');
        } catch (compositionErr) {
          const error = compositionErr as Error;
          console.error('Error saving composition:', error);
          setStatus(`Error: Could not save composition - ${error.message}`);
        }
      } else {
        setStatus('Error: No note generated');
      }
    } catch (err) {
      const error = err as Error;
      console.error('Error generating note:', error);
      setStatus(`Error: Could not generate note - ${error.message}`);

      // Update the composition with a dummy note
      if (savedComposition) {
        const dummyNote = "This is where the psychotherapy note would go";
        const updatedComposition: Composition = {
          ...savedComposition,
          section: [
            {
              title: 'Psychotherapy Note',
              text: {
                status: 'generated' as const,
                div: `<div xmlns="http://www.w3.org/1999/xhtml">${dummyNote}</div>`
              }
            },
            ...(savedComposition.section || [])
          ]
        };

        try {
          const updated = await medplum.updateResource(updatedComposition);
          setSavedComposition(updated as Composition);
          setPsychNote(dummyNote);
          setStatus('Dummy note added');
        } catch (updateErr) {
          const error = updateErr as Error;
          console.error('Error updating composition with dummy note:', error);
        }
      }
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
      const updatedComposition: Composition = {
        ...savedComposition,
        status: 'final' as const,
        section: [
          {
            title: 'Psychotherapy Note',
            text: {
              status: 'generated' as const,
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${note}</div>`
            }
          },
          {
            title: 'Transcript',
            text: {
              status: 'generated' as const,
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${transcript}</div>`
            }
          }
        ],
        subject: {
          reference: `Patient/${patient.id}`,
          display: getDisplayString(patient)
        }
      };

      const updated = await medplum.updateResource(updatedComposition);
      setSavedComposition(updated as Composition);
      onCompositionSaved?.();

      return updated as Composition;
    } catch (err) {
      const error = err as Error;
      console.error('Error saving composition:', error);
      throw error;
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.pause();
      setIsPaused(true);
    }
  };

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
              />
            </Group>
          </Group>
        
          <Stack gap="lg">
            <PatientSelector 
              onSelect={(patient: Patient) => setSelectedPatient(patient)}
              initialPatient={selectedPatient}
              context="audio"
            />
            
            <AudioControls
              isRecording={isRecording}
              isPaused={isPaused}
              isBlinking={isBlinking}
              hasTranscript={!!transcript}
              hasAudioBlob={!!audioBlob}
              status={status}
              disabled={!selectedPatient}
              onStart={startRecording}
              onStop={stopRecording}
              onPause={pauseRecording}
              onResume={resumeRecording}
              onCancel={cancelRecording}
              onPlay={playAudio}
              onTranscribe={transcribeAudio}
              onGenerateNote={generateNote}
            />

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