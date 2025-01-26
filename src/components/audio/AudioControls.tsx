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
  onTranscribeAudio: () => void;
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
  onTranscribeAudio,
  onGenerateNote,
}: AudioControlsProps): JSX.Element {
  return (
    <Paper p="md" radius="md" bg="gray.0">
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={500}>Status</Text>
        <Text size="sm" c={status.includes('Error') ? 'red' : 'dimmed'}>{status}</Text>
      </Group>

      {isRecording && (
        <Box mb="md">
          <Group justify="space-between" align="center">
            {!isPaused && (
              <Box
                style={(theme) => ({
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: theme.colors.red[6],
                  opacity: isBlinking ? 1 : 0.3,
                  transition: 'opacity 0.3s ease'
                })}
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
              color="yellow"
              onClick={isPaused ? onResumeRecording : onPauseRecording}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="subtle"
              color="gray"
              onClick={onCancelRecording}
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
              onClick={onPlayAudio}
              disabled={isTranscribing || isGeneratingNote}
            >
              Play Recording
            </Button>
            <Button
              color="teal"
              leftSection={isTranscribing ? <Loader size="sm" /> : <IconFileText size={20} />}
              onClick={onTranscribeAudio}
              disabled={isTranscribing || isGeneratingNote}
              loading={isTranscribing}
            >
              {isTranscribing ? 'Transcribing...' : 'Transcribe'}
            </Button>
          </Group>
        )}

        {hasTranscript && (
          <Button
            color="pink"
            leftSection={isGeneratingNote ? <Loader size="sm" /> : <IconNotes size={20} />}
            onClick={onGenerateNote}
            disabled={isTranscribing || isGeneratingNote}
            loading={isGeneratingNote}
          >
            {isGeneratingNote ? 'Generating Note...' : 'Generate Note'}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}