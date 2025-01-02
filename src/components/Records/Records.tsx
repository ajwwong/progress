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
  ActionIcon,
  Menu,
  TextInput,
  Progress,
  Avatar,
  Timeline,
  Table,
  Select,
  Drawer
} from '@mantine/core';
import {
  FileText,
  Mic,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Share2,
  MoreHorizontal,
  Search,
  Filter,
  Plus,
  Clock,
  Check,
  AlertCircle,
  Brain,
  LineChart,
  FileCheck,
  History,
  Edit,
  Eye,
  Copy,
  Trash
} from 'lucide-react';
import { useState } from 'react';
import { AudioRecorder } from './AudioRecorder';

interface SessionRecording {
  id: string;
  patientName: string;
  date: string;
  duration: string;
  status: 'completed' | 'processing' | 'review';
  noteStatus: 'completed' | 'pending' | 'review';
}

interface ClinicalNote {
  id: string;
  patientName: string;
  date: string;
  type: 'Progress Note' | 'Initial Assessment' | 'Treatment Plan';
  status: 'draft' | 'pending_review' | 'completed';
  aiGenerated: boolean;
  lastModified: string;
}

const recentRecordings: SessionRecording[] = [
  {
    id: '1',
    patientName: 'Sarah Johnson',
    date: '2024-02-20',
    duration: '50:00',
    status: 'completed',
    noteStatus: 'completed'
  },
  {
    id: '2',
    patientName: 'Michael Chen',
    date: '2024-02-19',
    duration: '45:30',
    status: 'review',
    noteStatus: 'review'
  },
  {
    id: '3',
    patientName: 'Emily Davis',
    date: '2024-02-18',
    duration: '55:00',
    status: 'processing',
    noteStatus: 'pending'
  }
];

const clinicalNotes: ClinicalNote[] = [
  {
    id: '1',
    patientName: 'Sarah Johnson',
    date: '2024-02-20',
    type: 'Progress Note',
    status: 'pending_review',
    aiGenerated: true,
    lastModified: '2024-02-20 14:30'
  },
  {
    id: '2',
    patientName: 'Michael Chen',
    date: '2024-02-19',
    type: 'Progress Note',
    status: 'completed',
    aiGenerated: true,
    lastModified: '2024-02-19 15:45'
  },
  {
    id: '3',
    patientName: 'Emily Davis',
    date: '2024-02-18',
    type: 'Initial Assessment',
    status: 'draft',
    aiGenerated: false,
    lastModified: '2024-02-18 11:20'
  }
];

function RecordingItem({ recording }: { recording: SessionRecording }) {
  return (
    <Paper withBorder p="md">
      <Group position="apart">
        <Group>
          <ThemeIcon size="lg" variant="light" color="blue">
            <Mic size={18} />
          </ThemeIcon>
          <Stack gap={2}>
            <Text fw={500}>{recording.patientName}</Text>
            <Group gap="xs">
              <Text size="sm" c="dimmed">{recording.date}</Text>
              <Text size="sm" c="dimmed">•</Text>
              <Text size="sm" c="dimmed">{recording.duration}</Text>
              <Badge 
                color={
                  recording.status === 'completed' ? 'green' :
                  recording.status === 'processing' ? 'yellow' :
                  'blue'
                }
                size="sm"
              >
                {recording.status === 'completed' ? 'Completed' :
                 recording.status === 'processing' ? 'Processing' :
                 'Ready for Review'}
              </Badge>
            </Group>
          </Stack>
        </Group>

        <Group>
          <Button 
            variant="light" 
            size="xs"
            leftSection={<Play size={14} />}
          >
            Play
          </Button>
          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <ActionIcon variant="subtle">
                <MoreHorizontal size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<Download size={14} />}>Download</Menu.Item>
              <Menu.Item leftSection={<Share2 size={14} />}>Share</Menu.Item>
              <Menu.Item leftSection={<FileText size={14} />}>View Note</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Paper>
  );
}

function NoteRow({ note }: { note: ClinicalNote }) {
  return (
    <tr>
      <td>
        <Group gap="sm">
          <ThemeIcon size="md" variant="light" color="blue">
            <FileText size={16} />
          </ThemeIcon>
          <Text fw={500}>{note.patientName}</Text>
        </Group>
      </td>
      <td>{note.date}</td>
      <td>{note.type}</td>
      <td>
        <Badge 
          color={
            note.status === 'completed' ? 'green' :
            note.status === 'pending_review' ? 'yellow' :
            'blue'
          }
        >
          {note.status === 'completed' ? 'Completed' :
           note.status === 'pending_review' ? 'Needs Review' :
           'Draft'}
        </Badge>
      </td>
      <td>
        {note.aiGenerated && (
          <Badge color="violet" variant="dot">AI Generated</Badge>
        )}
      </td>
      <td>{note.lastModified}</td>
      <td>
        <Group gap="xs">
          <ActionIcon variant="subtle" color="blue">
            <Eye size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="blue">
            <Edit size={16} />
          </ActionIcon>
          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <ActionIcon variant="subtle">
                <MoreHorizontal size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<Copy size={14} />}>Duplicate</Menu.Item>
              <Menu.Item leftSection={<Share2 size={14} />}>Share</Menu.Item>
              <Menu.Item leftSection={<Download size={14} />}>Export</Menu.Item>
              <Menu.Divider />
              <Menu.Item leftSection={<Trash size={14} />} color="red">Delete</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </td>
    </tr>
  );
}

export function Records() {
  const [selectedTab, setSelectedTab] = useState<string>('recordings');

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={2}>Records</Title>
            <Text c="dimmed">Manage session recordings and clinical documentation</Text>
          </Stack>
          <Group>
            <Button variant="light" leftSection={<Plus size={16} />}>
              New Note
            </Button>
          </Group>
        </Group>

        <Tabs value={selectedTab} onChange={setSelectedTab}>
          <Tabs.List>
            <Tabs.Tab value="recordings" leftSection={<Mic size={16} />}>
              Recordings
            </Tabs.Tab>
            <Tabs.Tab value="notes" leftSection={<FileText size={16} />}>
              Clinical Notes
            </Tabs.Tab>
            <Tabs.Tab value="treatment" leftSection={<Brain size={16} />}>
              Treatment Plans
            </Tabs.Tab>
            <Tabs.Tab value="progress" leftSection={<LineChart size={16} />}>
              Progress Tracking
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="recordings" pt="xl">
            <Stack gap="xl">
              <AudioRecorder />

              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Group position="apart">
                    <Title order={4}>Recent Recordings</Title>
                    <Group>
                      <TextInput
                        placeholder="Search recordings"
                        leftSection={<Search size={16} />}
                      />
                      <Button variant="light" leftSection={<Filter size={16} />}>
                        Filter
                      </Button>
                    </Group>
                  </Group>

                  {recentRecordings.map((recording) => (
                    <RecordingItem key={recording.id} recording={recording} />
                  ))}
                </Stack>
              </Paper>

              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Title order={4}>AI Note Generation Status</Title>
                  
                  <Timeline active={1} bulletSize={24}>
                    <Timeline.Item 
                      bullet={<Check size={12} />} 
                      title="Recording Complete"
                    >
                      <Text size="sm" c="dimmed">Session recording finished</Text>
                      <Text size="xs" mt={4}>2:30 PM</Text>
                    </Timeline.Item>

                    <Timeline.Item 
                      bullet={<Clock size={12} />} 
                      title="Transcription Processing"
                    >
                      <Text size="sm" c="dimmed">Converting audio to text</Text>
                      <Text size="xs" mt={4}>Est. 5 minutes remaining</Text>
                    </Timeline.Item>

                    <Timeline.Item
                      bullet={<Brain size={12} />}
                      title="Clinical Note Generation"
                    >
                      <Text size="sm" c="dimmed">Creating structured clinical note</Text>
                    </Timeline.Item>

                    <Timeline.Item
                      bullet={<AlertCircle size={12} />}
                      title="Ready for Review"
                    >
                      <Text size="sm" c="dimmed">Note ready for clinician review</Text>
                    </Timeline.Item>
                  </Timeline>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="notes" pt="xl">
            <Stack gap="xl">
              <Group>
                <TextInput
                  placeholder="Search notes"
                  leftSection={<Search size={16} />}
                  style={{ flex: 1 }}
                />
                <Select
                  placeholder="Note Type"
                  data={[
                    'All Types',
                    'Progress Note',
                    'Initial Assessment',
                    'Treatment Plan'
                  ]}
                  defaultValue="All Types"
                  w={200}
                />
                <Select
                  placeholder="Status"
                  data={[
                    'All Status',
                    'Draft',
                    'Needs Review',
                    'Completed'
                  ]}
                  defaultValue="All Status"
                  w={200}
                />
                <Button variant="light" leftSection={<Filter size={16} />}>
                  More Filters
                </Button>
              </Group>

              <Paper withBorder>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Patient</Table.Th>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Source</Table.Th>
                      <Table.Th>Last Modified</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {clinicalNotes.map((note) => (
                      <NoteRow key={note.id} note={note} />
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>

              <Group grow>
                <Paper withBorder p="xl">
                  <Stack gap="md">
                    <ThemeIcon size="xl" radius="md" color="blue" variant="light">
                      <FileCheck size={22} />
                    </ThemeIcon>
                    <Text fw={500}>Note Templates</Text>
                    <Text size="sm" c="dimmed">Standardized templates for documentation</Text>
                    <Button variant="light" fullWidth>Manage Templates</Button>
                  </Stack>
                </Paper>

                <Paper withBorder p="xl">
                  <Stack gap="md">
                    <ThemeIcon size="xl" radius="md" color="violet" variant="light">
                      <Brain size={22} />
                    </ThemeIcon>
                    <Text fw={500}>AI Settings</Text>
                    <Text size="sm" c="dimmed">Configure AI note generation preferences</Text>
                    <Button variant="light" fullWidth>Configure</Button>
                  </Stack>
                </Paper>
              </Group>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}