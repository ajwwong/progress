import { useState, useRef } from 'react';
import { Paper, Stack, Group, Text, Button, Badge, Timeline } from '@mantine/core';
import { Mic, Brain, FileText, Check, AlertCircle } from 'lucide-react';

export function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      // Start recording in the background
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Automatically stop after 60 minutes
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 60 * 60 * 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Paper withBorder p="xl">
      <Stack gap="md">
        <Group position="apart">
          <Group>
            <Text fw={500}>Session Recording</Text>
            {isRecording && (
              <Badge color="red" variant="dot">Recording in Progress</Badge>
            )}
          </Group>
          {isRecording && <Text>{formatTime(recordingTime)}</Text>}
        </Group>

        <Group>
          {!isRecording ? (
            <Button
              onClick={startRecording}
              leftSection={<Mic size={16} />}
              color="blue"
            >
              Start Session Recording
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              color="red"
            >
              End Session
            </Button>
          )}
        </Group>

        {isRecording && (
          <Timeline active={1} bulletSize={24}>
            <Timeline.Item 
              bullet={<Mic size={12} />} 
              title="Recording Session"
            >
              <Text size="sm" c="dimmed">Recording in progress</Text>
              <Text size="xs" mt={4}>Started at {new Date().toLocaleTimeString()}</Text>
            </Timeline.Item>

            <Timeline.Item
              bullet={<Brain size={12} />}
              title="Transcription"
            >
              <Text size="sm" c="dimmed">Will begin after recording ends</Text>
            </Timeline.Item>

            <Timeline.Item
              bullet={<FileText size={12} />}
              title="Note Generation"
            >
              <Text size="sm" c="dimmed">AI will process transcription into clinical note</Text>
            </Timeline.Item>

            <Timeline.Item
              bullet={<AlertCircle size={12} />}
              title="Review"
            >
              <Text size="sm" c="dimmed">Note will be ready for your review</Text>
            </Timeline.Item>
          </Timeline>
        )}
      </Stack>
    </Paper>
  );
}