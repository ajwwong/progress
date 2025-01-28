import { Box, Paper, Stack, Text, Title } from '@mantine/core';

interface TranscriptionViewProps {
  transcript?: string;
  psychNote?: {
    content: string;
    prompt?: string;
  };
}

export function TranscriptionView({ transcript, psychNote }: TranscriptionViewProps): JSX.Element | null {
  if (!transcript && !psychNote) return null;

  return (
    <Stack gap="lg">
      {transcript && (
        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Title order={3}>Transcript</Title>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{transcript}</Text>
          </Stack>
        </Paper>
      )}

      {psychNote && (
        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Title order={3}>Progress Note</Title>
            <Stack gap="xs">
              {psychNote.content.split('\n\n').map((section, index) => {
                // Check if this section has a title (format: "Title:\nContent")
                const [title, ...contentParts] = section.split('\n');
                const hasTitle = title.includes(':');
                
                if (hasTitle) {
                  return (
                    <Box key={index} mb={8}>
                      <Text 
                        fw={500} 
                        size="sm" 
                        c="blue.7" 
                        mb={4}
                        style={{
                          borderBottom: '1px solid var(--mantine-color-blue-2)',
                          paddingBottom: '4px',
                        }}
                      >
                        {title}
                      </Text>
                      <Text 
                        size="sm" 
                        style={{ 
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.5',
                          '& p': { marginBottom: '0.5rem' }
                        }}
                      >
                        {contentParts.join('\n').trim()}
                      </Text>
                    </Box>
                  );
                }
                
                // If no title, just render the content
                return (
                  <Text 
                    key={index} 
                    size="sm" 
                    mb={8}
                    style={{ 
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.5'
                    }}
                  >
                    {section.trim()}
                  </Text>
                );
              })}
            </Stack>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
