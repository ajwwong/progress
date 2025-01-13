import { Title, Stack, Group, Button, Modal } from '@mantine/core';
import { Document } from '@medplum/react';
import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useTemplates } from './hooks/useTemplates';
import { TemplateCard } from './components/TemplateCard';
import { TemplateEditor } from './components/TemplateEditor';
import { NoteTemplate, defaultSections } from './types';

export function NoteTemplatesPage(): JSX.Element {
  const { templates, loading, saveTemplate, deleteTemplate } = useTemplates();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);

  const handleNewTemplate = () => {
    setEditingTemplate({
      name: '',
      type: 'progress',
      sections: defaultSections
    });
    setIsEditorOpen(true);
  };

  const handleEditTemplate = (template: NoteTemplate) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleSaveTemplate = async (template: NoteTemplate) => {
    const success = await saveTemplate(template);
    if (success) {
      setIsEditorOpen(false);
      setEditingTemplate(null);
    }
  };

  return (
    <Document>
      <Stack spacing="xl">
        <Group position="apart">
          <Title order={2}>Note Templates</Title>
          <Button 
            onClick={handleNewTemplate}
          >
            <Group spacing="xs">
              <IconPlus size={16} />
              <span>New Template</span>
            </Group>
          </Button>
        </Group>

        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={handleEditTemplate}
            onDelete={deleteTemplate}
          />
        ))}

        <Modal
          opened={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingTemplate(null);
          }}
          title="Edit Template"
          size="xl"
        >
          {editingTemplate && (
            <TemplateEditor
              template={editingTemplate}
              onSave={handleSaveTemplate}
              onCancel={() => {
                setIsEditorOpen(false);
                setEditingTemplate(null);
              }}
            />
          )}
        </Modal>
      </Stack>
    </Document>
  );
}