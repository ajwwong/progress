import { Box, Button, Container, Group, Text, Title } from '@mantine/core';
import { IconPlayerRecord, IconPlayerStop, IconPlayerPlay, IconFileText, IconBrain, IconNotes, IconPlayerPause, IconPlayerResume } from '@tabler/icons-react';
import { useState, useRef, useEffect } from 'react';
import { useMedplum } from '@medplum/react';

export function AudioTranscribePage(): JSX.Element {
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
    try {
      setStatus('Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunksRef.current = [];

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
    if (!audioBlob) return;
    
    try {
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
    
    try {
      setStatus('Generating psychotherapy note...');
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
        setStatus('Psychotherapy note generated');
      } else {
        setStatus('Error: No note generated');
      }
    } catch (err) {
      console.error('Error generating note:', err);
      setStatus('Error: Could not generate note');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.pause();
      setIsPaused(true);
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

  return (
    <Container size="sm" mt="xl">
      <Box p="xl" sx={(theme) => ({
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.colors.gray[2]}`,
      })}>
        <Title order={1} mb="xl">Audio Transcription</Title>
        
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
    </Container>
  );
}
