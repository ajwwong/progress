import { Container, Paper, Stack, Group, Title, Button, TextInput, Select, Divider, Box, Grid, ActionIcon, Menu, Text, Badge, Modal, Textarea } from '@mantine/core';
import { useNavigate, useParams } from 'react-router-dom';
import { IconArrowLeft, IconDeviceFloppy, IconEye, IconTrash, IconPlus, IconGripVertical } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useMedplum } from '@medplum/react';
import { Questionnaire, QuestionnaireItem } from '@medplum/fhirtypes';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const defaultItems: QuestionnaireItem[] = [
  {
    linkId: 'mental-status',
    text: 'Mental Status Exam',
    type: 'text',
    initial: [{ valueString: '' }]
  },
  {
    linkId: 'clinical-observations',
    text: 'Clinical Observations',
    type: 'text',
    initial: [{ valueString: '' }]
  },
  {
    linkId: 'treatment-progress',
    text: 'Treatment Progress',
    type: 'text',
    initial: [{ valueString: '' }]
  },
  {
    linkId: 'plan',
    text: 'Plan & Recommendations',
    type: 'text',
    initial: [{ valueString: '' }]
  }
];

export function TemplateEditorPage(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams();
  const medplum = useMedplum();
  const [template, setTemplate] = useState<Questionnaire>({
    resourceType: 'Questionnaire',
    status: 'active',
    title: '',
    code: [{
      system: 'http://progress.care/fhir',
      code: 'note-template',
      display: 'Note Template'
    }],
    extension: [
      {
        url: 'http://progress.care/fhir/template-type',
        valueCode: 'progress'
      }
    ],
    item: defaultItems
  });
  const [isDirty, setIsDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const loadTemplate = async () => {
      if (id) {
        try {
          const existingTemplate = await medplum.readResource('Questionnaire', id);
          setTemplate(existingTemplate);
        } catch (err) {
          console.error('Error loading template:', err);
        }
      }
    };
    loadTemplate();
  }, [id, medplum]);

  const handleSave = async () => {
    try {
      if (template.id) {
        await medplum.updateResource(template);
      } else {
        await medplum.createResource(template);
      }
      setIsDirty(false);
      navigate('/templates');
    } catch (err) {
      console.error('Error saving template:', err);
    }
  };

  const handleDelete = async () => {
    if (template.id) {
      try {
        await medplum.deleteResource('Questionnaire', template.id);
        navigate('/templates');
      } catch (err) {
        console.error('Error deleting template:', err);
      }
    }
  };

  const updateField = (field: keyof Questionnaire, value: any) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const updateTemplateType = (type: string) => {
    setTemplate(prev => ({
      ...prev,
      extension: [
        ...(prev.extension || []).filter(e => e.url !== 'http://progress.care/fhir/template-type'),
        {
          url: 'http://progress.care/fhir/template-type',
          valueCode: type
        }
      ]
    }));
    setIsDirty(true);
  };

  const addSection = () => {
    const newLinkId = `section-${Date.now()}`;
    setTemplate(prev => ({
      ...prev,
      item: [
        ...(prev.item || []),
        {
          linkId: newLinkId,
          text: 'New Section',
          type: 'text',
          initial: [{ valueString: '' }]
        }
      ]
    }));
    setIsDirty(true);
  };

  const updateSection = (index: number, field: string, value: string) => {
    setTemplate(prev => {
      const items = [...(prev.item || [])];
      items[index] = {
        ...items[index],
        [field]: value,
        ...(field === 'text' ? {} : {
          initial: [{ valueString: value }]
        })
      };
      return { ...prev, item: items };
    });
    setIsDirty(true);
  };

  const removeSection = (index: number) => {
    setTemplate(prev => ({
      ...prev,
      item: prev.item?.filter((_, i) => i !== index)
    }));
    setIsDirty(true);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    setTemplate(prev => {
      const items = [...(prev.item || [])];
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination!.index, 0, reorderedItem);
      return { ...prev, item: items };
    });
    setIsDirty(true);
  };

  const getTemplateType = () => {
    return template.extension?.find(e => 
      e.url === 'http://progress.care/fhir/template-type'
    )?.valueCode || 'progress';
  };

  return (
    <Container size="xl">
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Stack gap="xl">
          {/* Header */}
          <Group justify="space-between">
            <Group>
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => navigate('/templates')}
              >
                Back
              </Button>
              <Title order={2}>{template.id ? 'Edit Template' : 'New Template'}</Title>
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
                Save
              </Button>
            </Group>
          </Group>

          <Divider />

          {/* Basic Info */}
          <Grid>
            <Grid.Col span={8}>
              <TextInput
                label="Template Name"
                value={template.title || ''}
                onChange={(e) => updateField('title', e.currentTarget.value)}
                placeholder="Enter template name"
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select
                label="Template Type"
                value={getTemplateType()}
                onChange={(value) => value && updateTemplateType(value)}
                data={[
                  { value: 'progress', label: 'Progress Note' },
                  { value: 'intake', label: 'Intake Assessment' },
                  { value: 'discharge', label: 'Discharge Summary' },
                  { value: 'treatment', label: 'Treatment Plan' }
                ]}
              />
            </Grid.Col>
          </Grid>

          {/* Sections */}
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={3}>Sections</Title>
              <Button
                size="sm"
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={addSection}
              >
                Add Section
              </Button>
            </Group>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sections">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    <Stack gap="md">
                      {template.item?.map((item, index) => (
                        <Draggable 
                          key={item.linkId} 
                          draggableId={item.linkId} 
                          index={index}
                        >
                          {(provided) => (
                            <Paper
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              shadow="sm"
                              p="md"
                              withBorder
                            >
                              <Group align="flex-start">
                                <div {...provided.dragHandleProps}>
                                  <IconGripVertical size={16} style={{ marginTop: 8 }} />
                                </div>
                                <Box style={{ flex: 1 }}>
                                  <Stack gap="sm">
                                    <TextInput
                                      value={item.text || ''}
                                      onChange={(e) => updateSection(index, 'text', e.currentTarget.value)}
                                      placeholder="Section Title"
                                    />
                                    <Textarea
                                      value={item.initial?.[0]?.valueString || ''}
                                      onChange={(e) => updateSection(index, 'initial', e.currentTarget.value)}
                                      placeholder="Sample content for this section..."
                                      minRows={3}
                                      autosize
                                    />
                                  </Stack>
                                </Box>
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  onClick={() => removeSection(index)}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
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
        </Stack>
      </Paper>

      {/* Preview Modal */}
      <Modal
        opened={showPreview}
        onClose={() => setShowPreview(false)}
        title="Template Preview"
        size="xl"
      >
        <Stack gap="md">
          {template.item?.map((item, index) => (
            <Box key={index}>
              <Text fw={500} mb={4}>{item.text}</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {item.initial?.[0]?.valueString || 'No sample content'}
              </Text>
            </Box>
          ))}
        </Stack>
      </Modal>
    </Container>
  );
} 