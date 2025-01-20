import { useState } from 'react';
import { Modal, TextInput, Textarea, Stack, Group, Button, Select, ActionIcon } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { Note, NoteSection } from '../../hooks/usePatientNotes';

interface EditNoteModalProps {
  note?: Note;
  opened: boolean;
  onClose: () => void;
  onSave: (note: Omit<Note, 'id'>) => Promise<void>;
  isLoading?: boolean;
}

interface NoteTemplate {
  value: string;
  label: string;
}

interface NoteType {
  value: string;
  label: string;
  template: string;
}

const NOTE_TEMPLATES: NoteTemplate[] = [
  { value: 'progress', label: 'Progress Note' },
  { value: 'clinical', label: 'Clinical Note' },
  { value: 'intake', label: 'Intake Assessment' },
  { value: 'treatment', label: 'Treatment Plan' }
];

const NOTE_TYPES: NoteType[] = [
  { value: '11506-3', label: 'Progress Note', template: 'progress' },
  { value: '11488-4', label: 'Clinical Note', template: 'clinical' }
];

const DEFAULT_SECTIONS: Record<string, NoteSection[]> = {
  progress: [
    { title: 'Subjective', content: '' },
    { title: 'Objective', content: '' },
    { title: 'Assessment', content: '' },
    { title: 'Plan', content: '' }
  ],
  clinical: [
    { title: 'Chief Complaint', content: '' },
    { title: 'History', content: '' },
    { title: 'Examination', content: '' },
    { title: 'Assessment', content: '' },
    { title: 'Plan', content: '' }
  ],
  intake: [
    { title: 'Presenting Problem', content: '' },
    { title: 'History', content: '' },
    { title: 'Mental Status', content: '' },
    { title: 'Risk Assessment', content: '' },
    { title: 'Diagnosis', content: '' },
    { title: 'Treatment Recommendations', content: '' }
  ],
  treatment: [
    { title: 'Goals', content: '' },
    { title: 'Objectives', content: '' },
    { title: 'Interventions', content: '' },
    { title: 'Timeline', content: '' }
  ]
};

export function EditNoteModal({ 
  note, 
  opened, 
  onClose, 
  onSave,
  isLoading = false 
}: EditNoteModalProps): JSX.Element {
  const [sections, setSections] = useState<NoteSection[]>(
    note?.sections || [{ title: '', content: '' }]
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    note?.template || 'progress'
  );
  const [selectedType, setSelectedType] = useState(note?.type.code || '11506-3');

  const handleTemplateChange = (template: string) => {
    setSelectedTemplate(template);
    setSelectedType(NOTE_TYPES.find(t => t.template === template)?.value || selectedType);
    setSections([...DEFAULT_SECTIONS[template]]);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    const template = NOTE_TYPES.find(t => t.value === type)?.template || selectedTemplate;
    setSelectedTemplate(template);
    if (!note) { // Only auto-set sections for new notes
      setSections([...DEFAULT_SECTIONS[template]]);
    }
  };

  const handleAddSection = () => {
    setSections((prev: NoteSection[]) => [...prev, { title: '', content: '' }]);
  };

  const handleRemoveSection = (index: number) => {
    setSections((prev: NoteSection[]) => prev.filter((_: NoteSection, i: number) => i !== index));
  };

  const handleSectionChange = (index: number, field: keyof NoteSection, value: string) => {
    setSections((prev: NoteSection[]) => prev.map((section: NoteSection, i: number) => 
      i === index ? { ...section, [field]: value } : section
    ));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const noteType = NOTE_TYPES.find(t => t.value === selectedType);
    
    await onSave({
      title: formData.get('title') as string,
      date: formData.get('date') as string || new Date().toISOString(),
      type: {
        code: selectedType,
        display: noteType?.label || 'Progress Note'
      },
      sections: sections.filter(section => section.title || section.content),
      status: formData.get('status') as Note['status'] || 'preliminary',
      template: selectedTemplate
    });

    onClose();
  };

  return (
    <Modal 
      opened={opened} 
      onClose={onClose}
      title={note ? 'Edit Note' : 'New Note'}
      size="xl"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Group grow>
            <Select
              label="Template"
              value={selectedTemplate}
              onChange={(value) => handleTemplateChange(value || 'progress')}
              data={NOTE_TEMPLATES}
              disabled={isLoading || !!note}
            />
            <Select
              label="Note Type"
              value={selectedType}
              onChange={(value) => handleTypeChange(value || '11506-3')}
              data={NOTE_TYPES}
              disabled={isLoading || !!note}
            />
          </Group>

          <TextInput
            label="Title"
            name="title"
            required
            defaultValue={note?.title}
            placeholder="Enter note title"
            disabled={isLoading}
          />

          <Group grow>
            <TextInput
              label="Date"
              name="date"
              type="datetime-local"
              required
              defaultValue={note?.date ? 
                new Date(note.date).toISOString().slice(0, 16) : 
                new Date().toISOString().slice(0, 16)
              }
              disabled={isLoading}
            />

            <Select
              label="Status"
              name="status"
              required
              defaultValue={note?.status || 'preliminary'}
              data={[
                { value: 'preliminary', label: 'Draft' },
                { value: 'final', label: 'Final' }
              ]}
              disabled={isLoading}
            />
          </Group>

          <Stack gap="xs">
            {sections.map((section, index) => (
              <Group key={index} align="flex-start">
                <Stack style={{ flex: 1 }}>
                  <TextInput
                    label={index === 0 ? 'Section Title' : ''}
                    value={section.title}
                    onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                    placeholder="Enter section title"
                    disabled={isLoading}
                  />
                  <Textarea
                    value={section.content}
                    onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                    placeholder="Enter section content"
                    minRows={4}
                    disabled={isLoading}
                  />
                </Stack>
                {sections.length > 1 && (
                  <ActionIcon
                    color="red"
                    onClick={() => handleRemoveSection(index)}
                    disabled={isLoading}
                    mt={30}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                )}
              </Group>
            ))}
          </Stack>

          <Group justify="center">
            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={handleAddSection}
              disabled={isLoading}
            >
              Add Section
            </Button>
          </Group>

          <Group justify="flex-end">
            <Button variant="light" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
} 