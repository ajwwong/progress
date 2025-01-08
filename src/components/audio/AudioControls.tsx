import { Box, Button, Group, Text, Stack, Paper } from '@mantine/core';
import { 
  IconPlayerRecord, 
  IconPlayerStop, 
  IconPlayerPlay, 
  IconFileText, 
  IconNotes
} from '@tabler/icons-react';

interface AudioControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  isBlinking: boolean;
  hasTranscript: boolean;
  hasAudioBlob: boolean;
  status: string;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onPlay: () => void;
  onTranscribe: () => void;
  onGenerateNote: () => void;
}

export function AudioControls({
  isRecording,
  isPaused,
  isBlinking,
  hasTranscript,
  hasAudioBlob,
  status,
  disabled = false,
  onStart,
  onStop,
  onPause,
  onResume,
  onCancel,
  onPlay,
  onTranscribe,
  onGenerateNote,
}: AudioControlsProps): JSX.Element {
  return (
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
            leftSection={<IconPlayerRecord size={20} />}
            onClick={onStart}
            disabled={disabled}
          >
            Start Recording
          </Button>
        ) : (
          <Group grow>
            <Button
              color="red"
              leftSection={<IconPlayerStop size={20} />}
              onClick={onStop}
            >
              End Session
            </Button>
            <Button
              color="yellow"
              onClick={isPaused ? onResume : onPause}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="subtle"
              color="gray"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </Group>
        )}

        {hasAudioBlob && !isRecording && (
          <Group grow>
            <Button
              color="green"
              leftSection={<IconPlayerPlay size={20} />}
              onClick={onPlay}
            >
              Play Recording
            </Button>
            <Button
              color="teal"
              leftSection={<IconFileText size={20} />}
              onClick={onTranscribe}
            >
              Transcribe
            </Button>
          </Group>
        )}

        {hasTranscript && (
          <Button
            color="pink"
            leftSection={<IconNotes size={20} />}
            onClick={onGenerateNote}
          >
            Generate Note
          </Button>
        )}
      </Stack>
    </Paper>
  );
}