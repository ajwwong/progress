import { Title, Stack, Group, Button, Paper, Grid, Menu, ActionIcon, Text, Badge, Select, TextInput } from '@mantine/core';
import { Document } from '@medplum/react';
import { useState } from 'react';
import { IconPlus, IconSearch, IconFilter, IconDownload, IconUpload, IconDots, IconCopy } from '@tabler/icons-react';
import { useTemplates } from './hooks/useTemplates';
import { NoteTemplate } from './types';
import { useNavigate } from 'react-router-dom';

export function NoteTemplatesPage(): JSX.Element {
  const navigate = useNavigate();
  const { templates, loading, deleteTemplate } = useTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'progress', 'intake', 'discharge', 'treatment'];

  const handleNewTemplate = () => {
    navigate('/templates/new');
  };

  const handleEditTemplate = (template: NoteTemplate) => {
    navigate(`/templates/edit/${template.id}`);
  };

  const handleDuplicateTemplate = (template: NoteTemplate) => {
    // Remove the id so it's treated as a new template
    const { id, ...templateWithoutId } = template;
    navigate('/templates/new', { 
      state: { 
        template: {
          ...templateWithoutId,
          name: `${template.name} (Copy)`
        }
      }
    });
  };

  const filteredTemplates = templates
    .filter(template => 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedCategory === 'all' || template.type === selectedCategory)
    );

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
          <Grid>
            {filteredTemplates.map((template) => (
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
                      <Text fw={500}>{template.name}</Text>
                      <Badge 
                        size="sm" 
                        variant="light"
                        color={
                          template.type === 'progress' ? 'blue' :
                          template.type === 'intake' ? 'green' :
                          template.type === 'discharge' ? 'orange' :
                          'violet'
                        }
                      >
                        {template.type}
                      </Badge>
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
                          onClick={() => deleteTemplate(template.id!)}
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
                    {template.sections.length} sections
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
            ))}
          </Grid>
        </Stack>
      </Paper>
    </Document>
  );
}