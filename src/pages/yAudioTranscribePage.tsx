import { Box, Button, Container, Group, Text, Title, Modal, TextInput, Autocomplete } from '@mantine/core';
import { IconPlayerRecord, IconPlayerStop, IconPlayerPlay, IconFileText, IconBrain, IconNotes, IconPlayerPause, IconPlayerResume } from '@tabler/icons-react';
import { useState, useRef, useEffect } from 'react';
import { useMedplum } from '@medplum/react';
import { Composition } from '@medplum/fhirtypes';

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
  const [patientName, setPatientName] = useState('');
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string }[]>([]);

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
    if (!patientName) {
      setStatus('Please enter patient name before recording');
      return;
    }

    try {
      setStatus('Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunksRef.current = [];

      // Get the practitioner profile first
      const profile = await medplum.getProfile();
      const practitionerName = profile.name?.[0] ? 
        `${profile.name[0].given?.[0] || ''} ${profile.name[0].family || ''}`.trim() : 
        'Unknown Practitioner';

      // Create initial composition with author and patient
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
          display: patientName
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
        
        // Update composition with transcript
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
          // Use the patient name that was required at recording start
          const composition = await saveComposition(transcript, response.text, patientName);
          
          const timeString = new Date().toLocaleString();
          onTranscriptionStart(`${timeString} - ${patientName}`);
          
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

  const saveComposition = async (transcript: string, note: string, patientName: string) => {
    try {
      if (!savedComposition) {
        throw new Error('No existing composition found');
      }

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
        subject: { display: patientName }
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

  const loadPatients = async () => {
    try {
      const patients = await medplum.searchResources('Patient', {
        _count: '100'  // Adjust count as needed
      });
      
      const options = patients.map(patient => {
        const name = patient.name?.[0];
        const label = name ? 
          `${name.given?.join(' ') || ''} ${name.family || ''}`.trim() : 
          'Unknown Patient';
        return {
          value: label,
          label: label
        };
      });
      
      setPatientOptions(options);
    } catch (err) {
      console.error('Error searching patients:', err);
      return [];
    }
  };

  return (
    <Container size="sm" mt="xl">
      <Box p="xl" sx={(theme) => ({
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.colors.gray[2]}`,
      })}>
        <Title order={1} mb="xl">Audio Transcription</Title>
        
        <Box mb="xl">
          <Autocomplete
            label="Patient Name"
            placeholder="Search for patient"
            value={patientName}
            onChange={setPatientName}
            data={patientOptions}
            onSearchChange={async (query) => {
              const results = await searchPatients(query);
              setPatientOptions(results);
            }}
            nothingFound="No patients found"
            required
            styles={(theme) => ({
              label: {
                marginBottom: theme.spacing.xs,
                color: theme.colorScheme === 'dark' ? theme.colors.gray[3] : theme.colors.gray[7],
              },
              input: {
                '&:focus': {
                  borderColor: theme.colors.teal[6],
                },
              },
            })}
          />
        </Box>

        <Box mb="xl">
          <Text color="dimmed" size="sm">Status: {status}</Text>
        </Box>

        <Group spacing="md" direction="column">
          {!isRecording ? (
            <Button 
              fullWidth 
              size="md"
              color="blue"
              leftIcon={<IconPlayerRecord size={20} />}
              onClick={startRecording}
            >
              Start Recording
            </Button>
          ) : (
            <Group spacing="md" direction="column" w="100%">
              <Group position="apart" w="100%" align="center">
                <Box 
                  sx={(theme) => ({
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: theme.colors.red[6],
                    opacity: isBlinking ? 1 : 0.3,
                    transition: 'opacity 0.3s ease',
                    display: isPaused ? 'none' : 'block'
                  })}
                />
                <Text size="sm" color="dimmed">
                  {isPaused ? 'Recording Paused' : 'Recording in Progress'}
                </Text>
              </Group>

              <Group spacing="md" w="100%">
                <Button 
                  fullWidth 
                  size="md"
                  color="red"
                  leftIcon={<IconPlayerStop size={20} />}
                  onClick={stopRecording}
                >
                  End Session
                </Button>
                
                <Button
                  fullWidth
                  size="md"
                  color="yellow"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>

                <Button
                  fullWidth
                  size="md"
                  color="gray"
                  variant="outline"
                  onClick={cancelRecording}
                >
                  ✕
                </Button>
              </Group>
            </Group>
          )}

          {audioBlob && !isRecording && (
            <Group spacing="md" direction="column" w="100%">
              <Button
                fullWidth
                size="md"
                color="green"
                leftIcon={<IconPlayerPlay size={20} />}
                onClick={playAudio}
              >
                Play Recording
              </Button>

              <Button
                fullWidth
                size="md"
                color="teal"
                leftIcon={<IconFileText size={20} />}
                onClick={transcribeAudio}
              >
                Transcribe Audio
              </Button>
            </Group>
          )}

          {transcript && (
            <Button
              fullWidth
              size="md"
              color="pink"
              leftIcon={<IconNotes size={20} />}
              onClick={generateNote}
            >
              Generate Note
            </Button>
          )}
        </Group>

        {transcript && (
          <Box mt="xl">
            <Title order={2} size="h4" mb="md">Transcript</Title>
            <Text>{transcript}</Text>
          </Box>
        )}

        {psychNote && (
          <Box mt="xl">
            <Title order={2} size="h4" mb="md">Psychotherapy Note</Title>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{psychNote}</Text>
          </Box>
        )}
      </Box>

      {savedComposition && (
        <Box mt="xl">
          <Title order={2} size="h4" mb="md">Saved FHIR Composition</Title>
          <Box 
            p="md" 
            sx={(theme) => ({
              backgroundColor: theme.colors.gray[1],
              borderRadius: theme.radius.sm,
              fontFamily: 'monospace',
              fontSize: '0.85em',
              overflowX: 'auto'
            })}
          >
            <pre>
              {JSON.stringify(savedComposition, null, 2)}
            </pre>
          </Box>
        </Box>
      )}
    </Container>
  );
}
