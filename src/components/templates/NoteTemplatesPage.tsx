import { Title, Stack, Group, Button, Paper, Grid, Menu, ActionIcon, Text, Badge, Select, TextInput } from '@mantine/core';
import { Document, useMedplum } from '@medplum/react';
import { useState, useEffect, useRef } from 'react';
import { IconPlus, IconSearch, IconFilter, IconDownload, IconUpload, IconDots, IconCopy } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Questionnaire } from '@medplum/fhirtypes';
import { defaultTemplates, hasTemplate } from './defaultTemplates';

export function NoteTemplatesPage(): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [templates, setTemplates] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const creationInProgress = useRef(false);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        // Get all templates
        const results = await medplum.searchResources('Questionnaire', {
          _count: '100'
        });
        
        // Filter for note templates
        const templateResults = results.filter(q => 
          q.code?.some(c => c.code === 'note-template')
        );

        setTemplates(templateResults);
      } catch (err) {
        console.error('Error loading templates:', err);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [medplum]);

  const categories = ['all', 'progress', 'intake', 'discharge', 'treatment'];

  const handleNewTemplate = () => {
    navigate('/templates/new');
  };

  const handleEditTemplate = (template: Questionnaire) => {
    navigate(`/templates/edit/${template.id}`);
  };

  const handleDuplicateTemplate = async (template: Questionnaire) => {
    // Create a new template based on the existing one
    const newTemplate: Questionnaire = {
      ...template,
      id: undefined,
      title: `${template.title} (Copy)`,
      status: 'draft'
    };
    
    try {
      const saved = await medplum.createResource(newTemplate);
      navigate(`/templates/edit/${saved.id}`);
    } catch (err) {
      console.error('Error duplicating template:', err);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await medplum.deleteResource('Questionnaire', templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  const getTemplateType = (template: Questionnaire): string => {
    return template.extension?.find(e => 
      e.url === 'http://progress.care/fhir/template-type'
    )?.valueCode || 'progress';
  };

  const filteredTemplates = templates
    .filter(template => {
      const titleMatch = !searchQuery || 
        (template.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? true);
      const categoryMatch = selectedCategory === 'all' || 
        getTemplateType(template) === selectedCategory;
      return titleMatch && categoryMatch;
    });

  return (
    <Document>
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Stack gap="xl">
          {/* Header Section */}
          <Group justify="space-between" align="flex-end">
            <Stack gap="xs">
              <Title order={2}>Note Templates</Title>
              <Text size="sm" c="dimmed">Manage and customize your documentation templates</Text>
            </Stack>
            <Group>
              <Button.Group>
                <Button 
                  variant="light"
                  leftSection={<IconUpload size={16} />}
                  onClick={() => {/* TODO: Implement import */}}
                >
                  Import
                </Button>
                <Button 
                  variant="light"
                  leftSection={<IconDownload size={16} />}
                  onClick={() => {/* TODO: Implement export */}}
                >
                  Export
                </Button>
              </Button.Group>
              <Button 
                onClick={handleNewTemplate}
                leftSection={<IconPlus size={16} />}
              >
                New Template
              </Button>
            </Group>
          </Group>

          {/* Search and Filter Section */}
          <Group grow>
            <TextInput
              placeholder="Search templates..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
            />
            <Select
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value || 'all')}
              data={categories.map(cat => ({
                value: cat,
                label: cat.charAt(0).toUpperCase() + cat.slice(1)
              }))}
              leftSection={<IconFilter size={16} />}
            />
          </Group>

          {/* Templates Grid */}
          {loading ? (
            <Text>Loading templates...</Text>
          ) : templates.length === 0 ? (
            <Text c="dimmed">No templates found. Click "New Template" to create one.</Text>
          ) : (
            <Grid>
              {filteredTemplates.map((template) => {
                const templateType = getTemplateType(template);
                const sectionCount = template.item?.length || 0;
                
                return (
                  <Grid.Col key={template.id} span={4}>
                    <Paper 
                      shadow="sm" 
                      p="md" 
                      radius="md" 
                      withBorder
                      style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <Group justify="space-between" mb="xs">
                        <Stack gap={4}>
                          <Text fw={500}>
                            {template.title || `Untitled Template (ID: ${template.id?.slice(0, 8)}...)`}
                          </Text>
                          <Group gap={4}>
                            <Badge 
                              size="sm" 
                              variant="light"
                              color={
                                templateType === 'progress' ? 'blue' :
                                templateType === 'intake' ? 'green' :
                                templateType === 'discharge' ? 'orange' :
                                'violet'
                              }
                            >
                              {templateType}
                            </Badge>
                            <Badge size="sm" variant="outline">
                              {template.status || 'unknown'}
                            </Badge>
                          </Group>
                        </Stack>
                        <Menu position="bottom-end" shadow="md">
                          <Menu.Target>
                            <ActionIcon variant="subtle">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item 
                              leftSection={<IconCopy size={16} />}
                              onClick={() => handleDuplicateTemplate(template)}
                            >
                              Duplicate
                            </Menu.Item>
                            <Menu.Item 
                              color="red" 
                              onClick={() => handleDeleteTemplate(template.id!)}
                            >
                              Delete
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                      <Text 
                        size="sm" 
                        c="dimmed" 
                        style={{ flex: 1 }}
                      >
                        {sectionCount} sections
                      </Text>
                      <Button 
                        variant="light" 
                        fullWidth 
                        mt="md"
                        onClick={() => handleEditTemplate(template)}
                      >
                        Edit Template
                      </Button>
                    </Paper>
                  </Grid.Col>
                );
              })}
            </Grid>
          )}
        </Stack>
      </Paper>
    </Document>
  );
}