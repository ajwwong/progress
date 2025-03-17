import { useState } from 'react';
import { Modal, Stack, Textarea, Group, Button, Title } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { notifications } from '@mantine/notifications';

interface MagicEditModalProps {
  opened: boolean;
  onClose: () => void;
  onEdit: (editedText: string) => void;
  currentContent: string;
  transcriptContent?: string;
  sectionTitle: string;
}

export function MagicEditModal({
  opened,
  onClose,
  onEdit,
  currentContent,
  transcriptContent,
  sectionTitle
}: MagicEditModalProps): JSX.Element {
  const medplum = useMedplum();
  const [magicInstructions, setMagicInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMagicEdit = async () => {
    setIsProcessing(true);
    try {
      // Clean up the text by unescaping any escaped characters
      const cleanedContent = currentContent
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\\\/g, '\\');

      let prompt = `You are an experienced clinical psychologist or psychotherapist editing a psychotherapy progress note. You are specifically working on the "${sectionTitle}" section of the note.

Important Guidelines:
1. Maintain clinical professionalism and objectivity
2. Use clear, specific behavioral descriptions
3. Preserve any factual information from the original text
4. Ensure clinical accuracy and relevance
5. Keep the therapeutic modality and approach consistent
6. Maintain HIPAA compliance and appropriate clinical language

Your task is to modify the text according to these instructions:
${magicInstructions}

Current "${sectionTitle}" section content - please use this as a reference:
${cleanedContent}`;

      // Add transcript context if available
      if (transcriptContent) {
        prompt += `\n\nFor additional reference, here is the original session transcript. Use this to ensure accuracy and to add relevant details:
${transcriptContent}`;
      }

      prompt += `\n\nIMPORTANT RESPONSE INSTRUCTIONS:
1. Respond ONLY with the edited text
2. Do not include any explanations, comments, or other text
3. Your entire response should be the edited clinical note section that can be used as-is
4. Maintain the same general structure and format as the original text
5. Preserve any specific dates, times, or factual details from the original`;

      const response = await medplum.executeBot(
        {
          system: 'https://progressnotes.app',
          value: 'ask-claude',
        },
        { text: prompt },
        'application/json'
      );

      if (response.text) {
        onEdit(response.text.trim());
        onClose();
        setMagicInstructions('');
        
        notifications.show({
          title: 'Success',
          message: 'Magic edit applied successfully',
          color: 'green'
        });
      }
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to process magic edit: ' + (err instanceof Error ? err.message : 'Unknown error'),
        color: 'red'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Title order={3} style={{ color: 'var(--mantine-color-blue-8)' }}>Magic Edit - {sectionTitle}</Title>}
      size="lg"
    >
      <Stack gap="md">
        <Textarea
          label="Edit Instructions"
          description="Describe how you want to modify the note section"
          placeholder="e.g., 'Expand on the client's attachment patterns' or 'Add more detail about treatment progress'"
          value={magicInstructions}
          onChange={(e) => setMagicInstructions(e.currentTarget.value)}
          minRows={3}
          autosize
          styles={(theme) => ({
            input: {
              backgroundColor: theme.colors.gray[0]
            }
          })}
        />
        <Group justify="flex-end">
          <Button 
            onClick={onClose}
            variant="subtle"
            color="gray"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMagicEdit}
            loading={isProcessing}
            color="blue"
          >
            Apply Magic Edit
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
} 