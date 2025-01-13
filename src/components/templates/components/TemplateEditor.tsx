import { useState } from 'react';
import { Stack, TextInput, Box, Text, Textarea, Group, Button } from '@mantine/core';
import { NoteTemplate } from '../types';

interface TemplateEditorProps {
  template: NoteTemplate;
  onSave: (template: NoteTemplate) => void;
  onCancel: () => void;
}

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate>(template);

  const handleSectionChange = (index: number, content: string) => {
    const newSections = [...editingTemplate.sections];
    newSections[index] = {
      ...newSections[index],
      content
    };
    setEditingTemplate({ ...editingTemplate, sections: newSections });
  };

  return (
    <Stack spacing="md">
      <TextInput
        label="Template Name"
        value={editingTemplate.name}
        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
        required
      />

      {editingTemplate.sections.map((section, index) => (
        <Box key={index}>
          <Text fw={500} mb="xs">{section.title}</Text>
          <Textarea
            value={section.content}
            onChange={(e) => handleSectionChange(index, e.target.value)}
            minRows={10}
            autosize
          />
        </Box>
      ))}

      <Group position="right" mt="xl">
        <Button variant="light" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(editingTemplate)}>
          Save Template
        </Button>
      </Group>
    </Stack>
  );
}