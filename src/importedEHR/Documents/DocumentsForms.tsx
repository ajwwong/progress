import { 
  Container, 
  Title, 
  Paper, 
  Stack, 
  Group, 
  Text, 
  Button, 
  Tabs,
  ThemeIcon,
  Badge,
  TextInput,
  ActionIcon,
  Menu,
  Checkbox,
  Progress,
  Avatar
} from '@mantine/core';
import { 
  FileText, 
  Search, 
  Plus, 
  Filter,
  MoreHorizontal,
  Download,
  Trash,
  Edit,
  Copy,
  Share2,
  Upload,
  File,
  FileCheck,
  ClipboardCheck,
  Settings
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: 'intake' | 'consent' | 'assessment' | 'template';
  status: 'active' | 'draft';
  lastModified: string;
  assignedTo: number;
  completed: number;
}

const documents: Document[] = [
  {
    id: '1',
    name: 'Intake Questionnaire',
    type: 'intake',
    status: 'active',
    lastModified: '2024-02-15',
    assignedTo: 45,
    completed: 38
  },
  {
    id: '2',
    name: 'Informed Consent',
    type: 'consent',
    status: 'active',
    lastModified: '2024-02-10',
    assignedTo: 82,
    completed: 82
  },
  {
    id: '3',
    name: 'PHQ-9 Assessment',
    type: 'assessment',
    status: 'active',
    lastModified: '2024-02-08',
    assignedTo: 28,
    completed: 25
  },
  {
    id: '4',
    name: 'Treatment Plan Template',
    type: 'template',
    status: 'draft',
    lastModified: '2024-02-01',
    assignedTo: 0,
    completed: 0
  }
];

function DocumentRow({ document }: { document: Document }) {
  const completionRate = Math.round((document.completed / document.assignedTo) * 100) || 0;

  return (
    <Paper withBorder p="md" mb="sm">
      <Group position="apart" align="center">
        <Group>
          <ThemeIcon size="lg" variant="light" color="blue">
            <FileText size={18} />
          </ThemeIcon>
          <Stack gap={4}>
            <Text fw={500}>{document.name}</Text>
            <Group gap="xs">
              <Badge size="sm" variant="dot" color={document.status === 'active' ? 'green' : 'yellow'}>
                {document.status === 'active' ? 'Active' : 'Draft'}
              </Badge>
              <Text size="xs" c="dimmed">Last modified: {document.lastModified}</Text>
            </Group>
          </Stack>
        </Group>

        <Group>
          {document.status === 'active' && (
            <Group gap="xl" mr="xl">
              <Stack gap={2}>
                <Text size="sm" fw={500}>{document.completed}/{document.assignedTo}</Text>
                <Progress 
                  value={completionRate} 
                  size="sm" 
                  w={100}
                />
              </Stack>
            </Group>
          )}

          <Group gap="xs">
            <Button variant="light" size="xs" leftSection={<Share2 size={14} />}>
              Share
            </Button>
            <Menu position="bottom-end" shadow="md">
              <Menu.Target>
                <ActionIcon variant="subtle">
                  <MoreHorizontal size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<Edit size={14} />}>Edit</Menu.Item>
                <Menu.Item leftSection={<Copy size={14} />}>Duplicate</Menu.Item>
                <Menu.Item leftSection={<Download size={14} />}>Download</Menu.Item>
                <Menu.Divider />
                <Menu.Item leftSection={<Trash size={14} />} color="red">Delete</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Group>
    </Paper>
  );
}

export function DocumentsForms() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={2}>Documents & Forms</Title>
            <Text c="dimmed">Manage your practice documents, forms, and templates</Text>
          </Stack>
          <Group>
            <Button variant="light" leftSection={<Upload size={16} />}>Import</Button>
            <Button leftSection={<Plus size={16} />}>Create New</Button>
          </Group>
        </Group>

        <Tabs defaultValue="all">
          <Tabs.List>
            <Tabs.Tab value="all" leftSection={<FileText size={16} />}>
              All Documents
            </Tabs.Tab>
            <Tabs.Tab value="intake" leftSection={<File size={16} />}>
              Intake Forms
            </Tabs.Tab>
            <Tabs.Tab value="consent" leftSection={<FileCheck size={16} />}>
              Consent Forms
            </Tabs.Tab>
            <Tabs.Tab value="assessments" leftSection={<ClipboardCheck size={16} />}>
              Assessments
            </Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<Settings size={16} />}>
              Settings
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="all" pt="xl">
            <Stack>
              <Group>
                <TextInput
                  placeholder="Search documents"
                  leftSection={<Search size={16} />}
                  style={{ flex: 1 }}
                />
                <Button variant="light" leftSection={<Filter size={16} />}>
                  Filter
                </Button>
              </Group>

              <Group mb="md">
                <Checkbox label="Show archived documents" />
              </Group>

              {documents.map((doc) => (
                <DocumentRow key={doc.id} document={doc} />
              ))}
            </Stack>
          </Tabs.Panel>

          {/* Other tab panels would have similar structure */}
        </Tabs>
      </Stack>
    </Container>
  );
}