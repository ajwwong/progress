import { Box, Button, Group, Text, Stack, Paper, Loader } from '@mantine/core';
import { 
  IconPlayerRecord, 
  IconPlayerStop, 
  IconPlayerPlay, 
  IconFileText, 
  IconNotes,
  IconLoader
} from '@tabler/icons-react';

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

export function AudioControls({
  isRecording,
  isPaused,
  isBlinking,
  hasTranscript,
  hasAudioBlob,
  status,
  disabled = false,
  isTranscribing,
  isGeneratingNote,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onCancelRecording,
  onPlayAudio,
  onGenerateNote,
}: AudioControlsProps): JSX.Element {
  return (
    <Paper 
      withBorder 
      p="md"
      styles={(theme) => ({
        root: {
          backgroundColor: theme.colors.gray[0]
        }
      })}
    >
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={500}>Status</Text>
        <Text size="sm" c={status.includes('Error') ? 'red' : 'dimmed'}>{status}</Text>
      </Group>

      {isRecording && (
        <Box mb="md">
          <Group justify="space-between" align="center">
            {!isPaused && (
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'red',
                  opacity: isBlinking ? 1 : 0.3,
                    transition: 'opacity 0.3s ease'
                }}
              />
            )}
            <Text size="sm" c="dimmed" style={{ flex: 1, textAlign: 'center' }}>
              {isPaused ? 'Recording Paused' : 'Recording in Progress'}
            </Text>
          </Group>
        </Box>
      )}

      <Stack gap="md">
        {!isRecording ? (
          <Button
            fullWidth
            size="md"
            color="blue"
            leftSection={<IconPlayerRecord size={20} />}
            onClick={onStartRecording}
            disabled={disabled}
          >
            Start Recording
          </Button>
        ) : (
          <Group grow>
            <Button
              color="red"
              leftSection={<IconPlayerStop size={20} />}
              onClick={onStopRecording}
            >
              End Session
            </Button>
            <Button
              color={isPaused ? 'blue' : 'gray'}
              leftSection={<IconPlayerPlay size={20} />}
              onClick={isPaused ? onResumeRecording : onPauseRecording}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
          </Group>
        )}

        {hasAudioBlob && !isRecording && (
          <Group grow>
            <Button
              variant="light"
              leftSection={<IconPlayerPlay size={20} />}
              onClick={onPlayAudio}
            >
              Play Audio
            </Button>
            {!hasTranscript && !isTranscribing && !isGeneratingNote && (
              <Button
                variant="light"
                color="red"
                leftSection={<IconPlayerStop size={20} />}
                onClick={onCancelRecording}
              >
                Cancel
              </Button>
            )}
          </Group>
        )}

        {hasTranscript && !isGeneratingNote && (
          <Button
            variant="light"
            leftSection={isGeneratingNote ? <IconLoader size={20} className="rotating" /> : <IconNotes size={20} />}
            onClick={onGenerateNote}
            loading={isGeneratingNote}
          >
            Generate Note
          </Button>
        )}
      </Stack>
    </Paper>
  );
}