import { Box, Group, Text, Button, Badge, ActionIcon, Avatar, Menu, TextInput, Modal, Stack, Select, Transition, ThemeIcon } from '@mantine/core';
import { 
  Search, 
  Plus, 
  ChevronDown, 
  Settings, 
  LogOut, 
  User, 
  CreditCard, 
  Building, 
  Clock, 
  Shield, 
  HelpCircle, 
  FileText,
  Sliders,
  Mic,
  Brain,
  Check,
  Calendar,
  Users,
  ClipboardList,
  FileSpreadsheet,
  MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useContext } from 'react';
import { CreateClientDrawer } from '../Clients/CreateClientDrawer';
import { CalendarContext } from '../../App';

export function Banner() {
  const navigate = useNavigate();
  const { setShowNewAppointmentModal } = useContext(CalendarContext);
  const [isRecording, setIsRecording] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'recording' | 'transcribing' | 'generating' | 'ready'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  const handleNewAppointment = () => {
    navigate('/');
    setShowNewAppointmentModal(true);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setProcessingStatus('recording');
      
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setShowAssignModal(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Simulate processing flow
      setProcessingStatus('transcribing');
      setTimeout(() => {
        setProcessingStatus('generating');
        setTimeout(() => {
          setProcessingStatus('ready');
        }, 3000);
      }, 2000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box 
      py={8}
      px="md" 
      style={(theme) => ({
        background: theme.white,
        borderBottom: `1px solid ${theme.colors.gray[2]}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      })}
    >
      <Group justify="space-between">
        <Group>
          <TextInput
            placeholder="Search clients"
            leftSection={<Search size={16} />}
            styles={(theme) => ({
              input: {
                backgroundColor: theme.colors.gray[0],
                border: 0,
                '&:focus': {
                  borderColor: 'transparent',
                },
              },
            })}
          />
        </Group>

        <Group>
          <Group gap="lg">
            <Menu position="bottom-end" shadow="md">
              <Menu.Target>
                <Button 
                  variant="light"
                  size="sm"
                  leftSection={<Plus size={16} />}
                  rightSection={<ChevronDown size={14} />}
                  styles={(theme) => ({
                    root: {
                      backgroundColor: theme.colors.blue[0],
                      color: theme.colors.blue[8],
                      '&:hover': {
                        backgroundColor: theme.colors.blue[1],
                      },
                    },
                    section: {
                      fontSize: theme.fontSizes.sm,
                    },
                  })}
                  aria-label="New"
                >
                  New
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item 
                  leftSection={<Calendar size={14} />}
                  onClick={handleNewAppointment}
                  id="new-appointment"
                >
                  New Appointment
                </Menu.Item>
                <Menu.Item 
                  leftSection={<Users size={14} />}
                  onClick={() => setShowCreateClient(true)}
                  id="new-client"
                >
                  New Client
                </Menu.Item>
                <Menu.Item 
                  leftSection={<ClipboardList size={14} />}
                  onClick={() => navigate('/records')}
                >
                  New Progress Note
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item 
                  leftSection={<FileSpreadsheet size={14} />}
                  onClick={() => navigate('/documents')}
                >
                  New Document
                </Menu.Item>
                <Menu.Item 
                  leftSection={<MessageSquare size={14} />}
                >
                  New Message
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>

            {isRecording ? (
              <Button
                variant="light"
                size="sm"
                color="red"
                leftSection={<Mic size={16} />}
                onClick={stopRecording}
              >
                {formatTime(recordingTime)}
              </Button>
            ) : (
              <Button
                variant="light"
                size="sm"
                color="blue"
                leftSection={<Mic size={16} />}
                onClick={startRecording}
              >
                Quick Record
              </Button>
            )}

            <Button
              variant="filled"
              size="sm"
              color="blue"
            >
              Messages
            </Button>
          </Group>

          <Menu position="bottom-end" shadow="md" width={260}>
            <Menu.Target>
              <Group gap="xs" style={{ cursor: 'pointer' }}>
                <Avatar 
                  size="sm" 
                  src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&q=80"
                  radius="xl"
                />
                <ChevronDown size={14} style={{ color: 'var(--mantine-color-gray-6)' }} />
              </Group>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Dr. Sarah Wilson</Menu.Label>
              <Menu.Item 
                leftSection={<User size={14} />}
                onClick={() => navigate('/profile')}
              >
                My Profile
              </Menu.Item>
              <Menu.Item 
                leftSection={<Building size={14} />}
                onClick={() => navigate('/settings')}
              >
                Practice Settings
              </Menu.Item>
              <Menu.Item 
                leftSection={<Clock size={14} />}
                onClick={() => navigate('/availability')}
              >
                Availability & Schedule
              </Menu.Item>
              <Menu.Item 
                leftSection={<FileText size={14} />}
                onClick={() => navigate('/documents')}
              >
                Documents & Forms
              </Menu.Item>

              <Menu.Divider />

              <Menu.Label>Account</Menu.Label>
              <Menu.Item 
                leftSection={<CreditCard size={14} />}
                onClick={() => navigate('/billing')}
              >
                Billing & Subscriptions
              </Menu.Item>
              <Menu.Item 
                leftSection={<Shield size={14} />}
                onClick={() => navigate('/security')}
              >
                Security Settings
              </Menu.Item>
              <Menu.Item 
                leftSection={<Sliders size={14} />}
                onClick={() => navigate('/preferences')}
              >
                Preferences
              </Menu.Item>

              <Menu.Divider />

              <Menu.Item 
                leftSection={<HelpCircle size={14} />}
                onClick={() => navigate('/help')}
              >
                Help & Support
              </Menu.Item>
              <Menu.Item 
                leftSection={<LogOut size={14} />} 
                color="red"
                onClick={() => navigate('/signout')}
              >
                Sign Out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <Modal
        opened={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Recording"
        size="lg"
      >
        <Stack gap="md">
          <Select
            label="Client"
            placeholder="Search or select client"
            searchable
            data={[
              { value: 'sarah-johnson', label: 'Sarah Johnson' },
              { value: 'michael-chen', label: 'Michael Chen' },
              { value: 'emily-davis', label: 'Emily Davis' }
            ]}
            required
          />

          <Select
            label="Appointment Type"
            placeholder="Select appointment type"
            data={[
              { value: 'individual', label: 'Individual Therapy' },
              { value: 'couples', label: 'Couples Therapy' },
              { value: 'group', label: 'Group Therapy' }
            ]}
            required
          />

          <Group grow>
            <Select
              label="Date"
              placeholder="Select date"
              data={[
                { value: 'today', label: 'Today' },
                { value: 'custom', label: 'Custom Date' }
              ]}
              defaultValue="today"
            />
            <Select
              label="Duration"
              placeholder="Select duration"
              data={[
                { value: '30', label: '30 minutes' },
                { value: '45', label: '45 minutes' },
                { value: '50', label: '50 minutes' },
                { value: '60', label: '60 minutes' }
              ]}
              defaultValue="50"
            />
          </Group>

          <Stack gap="xs">
            <Text fw={500}>Processing Status</Text>
            <Group gap="xs">
              <ThemeIcon 
                size="sm" 
                color={processingStatus === 'recording' ? 'red' : 'green'} 
                variant={processingStatus === 'recording' ? 'filled' : 'light'}
              >
                <Mic size={12} />
              </ThemeIcon>
              <Text size="sm">Recording Complete</Text>
            </Group>

            <Group gap="xs">
              <ThemeIcon 
                size="sm" 
                color={processingStatus === 'transcribing' ? 'yellow' : 
                       processingStatus === 'generating' || processingStatus === 'ready' ? 'green' : 'gray'} 
                variant={processingStatus === 'transcribing' ? 'filled' : 'light'}
              >
                <Brain size={12} />
              </ThemeIcon>
              <Text size="sm">Transcribing Audio</Text>
            </Group>

            <Group gap="xs">
              <ThemeIcon 
                size="sm" 
                color={processingStatus === 'generating' ? 'yellow' : 
                       processingStatus === 'ready' ? 'green' : 'gray'}
                variant={processingStatus === 'generating' ? 'filled' : 'light'}
              >
                <FileText size={12} />
              </ThemeIcon>
              <Text size="sm">Generating Progress Note</Text>
            </Group>

            <Group gap="xs">
              <ThemeIcon 
                size="sm" 
                color={processingStatus === 'ready' ? 'green' : 'gray'}
                variant={processingStatus === 'ready' ? 'filled' : 'light'}
              >
                <Check size={12} />
              </ThemeIcon>
              <Text size="sm">Ready for Review</Text>
            </Group>
          </Stack>

          <Group justify="flex-end" mt="xl">
            <Button variant="light" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowAssignModal(false);
              navigate('/records');
            }}>
              Save & View Note
            </Button>
          </Group>
        </Stack>
      </Modal>

      <CreateClientDrawer
        opened={showCreateClient}
        onClose={() => setShowCreateClient(false)}
      />
    </Box>
  );
}