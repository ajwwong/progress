import { Paper, Stack, Text, Title } from '@mantine/core';

interface TranscriptionViewProps {
  transcript?: string;
  psychNote?: string;
}

export function TranscriptionView({ transcript, psychNote }: TranscriptionViewProps): JSX.Element | null {
  if (!transcript && !psychNote) return null;

  return (
    <Stack gap="lg" mt="md">
      {transcript && (
        <Paper p="md" radius="md" withBorder>
          <Title order={3} size="h5" mb="md">Transcript</Title>
          <Text style={{ whiteSpace: 'pre-wrap' }}>{transcript}</Text>
        </Paper>
      )}

      {psychNote && (
        <Paper p="md" radius="md" withBorder>
          <Title order={3} size="h5" mb="md">Psychotherapy Note</Title>
          <Text style={{ whiteSpace: 'pre-wrap' }}>{psychNote}</Text>
        </Paper>
      )}
    </Stack>
  );
}
