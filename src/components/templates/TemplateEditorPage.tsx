import { Container, Paper, Stack, Group, Title, Button, TextInput, Select, Divider, Box, Grid, ActionIcon, Menu, Text, Badge, Modal, Textarea } from '@mantine/core';
import { useNavigate, useParams } from 'react-router-dom';
import { IconArrowLeft, IconDeviceFloppy, IconEye, IconTrash, IconPlus, IconGripVertical } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useTemplates } from './hooks/useTemplates';
import { NoteTemplate, defaultSections } from './types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export function TemplateEditorPage(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams();
  const { templates, saveTemplate, deleteTemplate } = useTemplates();
  const [template, setTemplate] = useState<NoteTemplate>({
    name: '',
    type: 'progress',
    sections: defaultSections
  });
  const [isDirty, setIsDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (id) {
      const existingTemplate = templates.find(t => t.id === id);
      if (existingTemplate) {
        setTemplate(existingTemplate);
      }
    }
  }, [id, templates]);

  const handleSave = async () => {
    const success = await saveTemplate(template);
    if (success) {
      setIsDirty(false);
      navigate('/templates');
    }
  };

  const handleDelete = async () => {
    if (template.id) {
      await deleteTemplate(template.id);
      navigate('/templates');
    }
  };

  const updateField = (field: keyof NoteTemplate, value: any) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const addSection = () => {
    setTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, { title: '', content: '' }]
    }));
    setIsDirty(true);
  };

  const updateSection = (index: number, field: string, value: string) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map((section, i) => 
        i === index ? { ...section, [field]: value } : section
      )
    }));
    setIsDirty(true);
  };

  const removeSection = (index: number) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
    setIsDirty(true);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sections = Array.from(template.sections);
    const [reorderedSection] = sections.splice(result.source.index, 1);
    sections.splice(result.destination.index, 0, reorderedSection);

    setTemplate(prev => ({ ...prev, sections }));
    setIsDirty(true);
  };

  return (
    <Container size="xl" py="xl">
      {/* Header */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Group justify="space-between">
          <Group>
            <Button 
              variant="subtle" 
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/templates')}
            >
              Back to Templates
            </Button>
            <Divider orientation="vertical" />
            <Title order={3}>{id ? 'Edit Template' : 'New Template'}</Title>
            {isDirty && <Badge color="yellow">Unsaved Changes</Badge>}
          </Group>
          <Group>
            <Button
              variant="light"
              leftSection={<IconEye size={16} />}
              onClick={() => setShowPreview(true)}
            >
              Preview
            </Button>
            {template.id && (
              <Button
                variant="light"
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={handleSave}
              disabled={!isDirty}
            >
              Save Template
            </Button>
          </Group>
        </Group>
      </Paper>

      <Grid>
        {/* Main Editor */}
        <Grid.Col span={8}>
          <Stack gap="md">
            <Paper shadow="sm" p="md" radius="md" withBorder>
              <Stack gap="md">
                <TextInput
                  label="Template Name"
                  placeholder="Enter template name"
                  value={template.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />
                <Select
                  label="Template Type"
                  value={template.type}
                  onChange={(value) => updateField('type', value)}
                  data={[
                    { value: 'progress', label: 'Progress Note' },
                    { value: 'intake', label: 'Intake Assessment' },
                    { value: 'discharge', label: 'Discharge Summary' },
                    { value: 'treatment', label: 'Treatment Plan' }
                  ]}
                  required
                />
              </Stack>
            </Paper>

            <Paper shadow="sm" p="md" radius="md" withBorder>
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={4}>Sections</Title>
                  <Button
                    variant="light"
                    leftSection={<IconPlus size={16} />}
                    onClick={addSection}
                    size="sm"
                  >
                    Add Section
                  </Button>
                </Group>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="sections">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef}>
                        <Stack gap="md">
                          {template.sections.map((section, index) => (
                            <Draggable 
                              key={index} 
                              draggableId={`section-${index}`} 
                              index={index}
                            >
                              {(provided) => (
                                <Paper
                                  shadow="sm"
                                  p="md"
                                  radius="md"
                                  withBorder
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                >
                                  <Group justify="space-between" mb="xs">
                                    <Group>
                                      <div {...provided.dragHandleProps}>
                                        <IconGripVertical 
                                          size={16} 
                                          style={{ 
                                            color: 'var(--mantine-color-gray-5)',
                                            cursor: 'grab'
                                          }} 
                                        />
                                      </div>
                                      <TextInput
                                        placeholder="Section Title"
                                        value={section.title}
                                        onChange={(e) => updateSection(index, 'title', e.target.value)}
                                        size="sm"
                                        style={{ width: '200px' }}
                                      />
                                    </Group>
                                    <ActionIcon
                                      color="red"
                                      variant="light"
                                      onClick={() => removeSection(index)}
                                    >
                                      <IconTrash size={16} />
                                    </ActionIcon>
                                  </Group>
                                  <Textarea
                                    placeholder="Default content or instructions..."
                                    value={section.content}
                                    onChange={(e) => updateSection(index, 'content', e.target.value)}
                                    minRows={3}
                                    autosize
                                  />
                                </Paper>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </Stack>
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>

        {/* Side Panel */}
        <Grid.Col span={4}>
          <Stack gap="md">
            <Paper shadow="sm" p="md" radius="md" withBorder>
              <Stack gap="xs">
                <Title order={4}>Template Preview</Title>
                <Text size="sm" c="dimmed">
                  Preview how your template will look when creating a new note.
                </Text>
                <Button 
                  variant="light" 
                  fullWidth
                  leftSection={<IconEye size={16} />}
                  onClick={() => setShowPreview(true)}
                >
                  Open Preview
                </Button>
              </Stack>
            </Paper>

            <Paper shadow="sm" p="md" radius="md" withBorder>
              <Stack gap="xs">
                <Title order={4}>Common Sections</Title>
                <Text size="sm" c="dimmed">
                  Click to add these common sections to your template.
                </Text>
                <Stack gap="xs">
                  {[
                    'Mental Status Exam',
                    'Risk Assessment',
                    'Treatment Goals',
                    'Interventions Used',
                    'Plan & Recommendations'
                  ].map((section) => (
                    <Button
                      key={section}
                      variant="light"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        setTemplate(prev => ({
                          ...prev,
                          sections: [...prev.sections, { title: section, content: '' }]
                        }));
                        setIsDirty(true);
                      }}
                    >
                      {section}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Preview Modal */}
      <Modal
        opened={showPreview}
        onClose={() => setShowPreview(false)}
        title={<Title order={3}>{template.name || 'Untitled Template'}</Title>}
        size="xl"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Template Type: {template.type.charAt(0).toUpperCase() + template.type.slice(1)}
          </Text>
          {template.sections.map((section, index) => (
            <Paper key={index} shadow="sm" p="md" radius="md" withBorder>
              <Title order={4} mb="xs">{section.title || 'Untitled Section'}</Title>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {section.content || 'No default content'}
              </Text>
            </Paper>
          ))}
        </Stack>
      </Modal>
    </Container>
  );
} 