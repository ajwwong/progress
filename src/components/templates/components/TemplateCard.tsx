import { Paper, Group, Text, ActionIcon, Box, Collapse, UnstyledButton } from '@mantine/core';
import { IconEdit, IconTrash, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { NoteTemplate } from '../types';
import { useState } from 'react';

interface TemplateCardProps {
  template: NoteTemplate;
  onEdit: (template: NoteTemplate) => void;
  onDelete: (templateId: string) => void;
}

export function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const [opened, setOpened] = useState(false);

  return (
    <Paper p="md" withBorder>
      <UnstyledButton 
        onClick={() => setOpened(o => !o)}
        style={{ width: '100%' }}
      >
        <Group justify="space-between">
          <Group>
            {opened ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
            <Text size="lg" fw={500}>{template.name}</Text>
          </Group>
          <Group gap="xs" onClick={(e) => e.stopPropagation()}>
            <ActionIcon
              variant="light"
              color="blue"
              onClick={() => onEdit(template)}
            >
              <IconEdit size={16} />
            </ActionIcon>
            <ActionIcon
              variant="light"
              color="red"
              onClick={() => template.id && onDelete(template.id)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </UnstyledButton>

      <Collapse in={opened} transitionDuration={200}>
        <Box mt="md">
          {template.sections.map((section, index) => (
            <Box key={index} mb="md">
              <Text fw={500} mb="xs">{section.title}</Text>
              <Text 
                size="sm" 
                style={{ 
                  whiteSpace: 'pre-wrap',
                  color: 'var(--mantine-color-gray-7)'
                }}
              >
                {section.sampleContent}
              </Text>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}