import { Modal, Button, Group, TextInput, Select, Stack, Text, Badge, Anchor, Paper, ActionIcon, Transition, ThemeIcon } from '@mantine/core';
import { User, Play, Pause, Square, AlertCircle, Mic, Brain, FileText, Check } from 'lucide-react';
import type { Appointment } from '../../types/calendar';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';

interface AppointmentDetailsModalProps {
  opened: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

const typeColors = {
  checkup: 'cyan',
  surgery: 'red',
  consultation: 'violet',
  followup: 'teal',
} as const;

export function AppointmentDetailsModal({ opened, onClose, appointment }: AppointmentDetailsModalProps) {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'recording' | 'transcribing' | 'generating' | 'ready'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  
  if (!appointment) return null;

  const duration = Math.round(
    (appointment.end.getTime() - appointment.start.getTime()) / (1000 * 60)
  );

  const handlePatientClick = () => {
    onClose();
    navigate(`/patients/${encodeURIComponent(appointment.patientName)}`);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      // Start recording in the background
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setProcessingStatus('recording');
      
      // Start timer
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
      setProcessingStatus('transcribing');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Simulate processing flow
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
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Anchor 
          onClick={handlePatientClick}
          underline="hover"
          c="blue"
          style={{ cursor: 'pointer', fontSize: '1.2rem', fontWeight: 500 }}
        >
          {appointment.patientName}
        </Anchor>
      }
      size="lg"
    >
      <Stack gap="md">
        <Group gap="xs">
          <Badge color={typeColors[appointment.type]} size="lg">
            {appointment.type}
          </Badge>
        </Group>

        <Paper withBorder p="md" bg="gray.0">
          <Stack gap="md">
            <Group position="apart">
              <Group>
                <ThemeIcon 
                  size="lg" 
                  variant="light" 
                  color={isRecording ? 'red' : 'blue'}
                >
                  <Mic size={18} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text fw={500}>Session Recording</Text>
                  {processingStatus !== 'idle' && (
                    <Badge 
                      color={
                        processingStatus === 'recording' ? 'red' :
                        processingStatus === 'ready' ? 'green' : 
                        'yellow'
                      }
                    >
                      {processingStatus === 'recording' ? 'Recording' :
                       processingStatus === 'transcribing' ? 'Transcribing' :
                       processingStatus === 'generating' ? 'Generating Note' :
                       'Ready for Review'}
                    </Badge>
                  )}
                </Stack>
              </Group>
              {isRecording && <Text fw={500}>{formatTime(recordingTime)}</Text>}
            </Group>

            <Group>
              {processingStatus === 'idle' && (
                <Button
                  onClick={startRecording}
                  leftSection={<Mic size={16} />}
                  color="blue"
                  fullWidth
                >
                  Start Session Recording
                </Button>
              )}
              
              {isRecording && (
                <Button
                  onClick={stopRecording}
                  color="red"
                  fullWidth
                >
                  End Session
                </Button>
              )}

              {processingStatus === 'ready' && (
                <Button
                  variant="light"
                  color="blue"
                  fullWidth
                  onClick={() => navigate(`/patients/${encodeURIComponent(appointment.patientName)}`)}
                >
                  View Progress Note
                </Button>
              )}
            </Group>

            {processingStatus !== 'idle' && (
              <Stack gap="xs">
                <Group gap="xs" align="center">
                  <ThemeIcon 
                    size="sm" 
                    color={processingStatus === 'recording' ? 'red' : 'green'} 
                    variant={processingStatus === 'recording' ? 'filled' : 'light'}
                  >
                    {processingStatus === 'recording' ? <Mic size={12} /> : <Check size={12} />}
                  </ThemeIcon>
                  <Text size="sm" fw={500}>Recording Session</Text>
                </Group>

                <Group gap="xs" align="center">
                  <ThemeIcon 
                    size="sm" 
                    color={processingStatus === 'transcribing' ? 'yellow' : 
                           processingStatus === 'generating' || processingStatus === 'ready' ? 'green' : 'gray'} 
                    variant={processingStatus === 'transcribing' ? 'filled' : 'light'}
                  >
                    <Brain size={12} />
                  </ThemeIcon>
                  <Text size="sm" fw={500}>Transcribing Audio</Text>
                </Group>

                <Group gap="xs" align="center">
                  <ThemeIcon 
                    size="sm" 
                    color={processingStatus === 'generating' ? 'yellow' : 
                           processingStatus === 'ready' ? 'green' : 'gray'}
                    variant={processingStatus === 'generating' ? 'filled' : 'light'}
                  >
                    <FileText size={12} />
                  </ThemeIcon>
                  <Text size="sm" fw={500}>Generating Progress Note</Text>
                </Group>

                <Group gap="xs" align="center">
                  <ThemeIcon 
                    size="sm" 
                    color={processingStatus === 'ready' ? 'green' : 'gray'}
                    variant={processingStatus === 'ready' ? 'filled' : 'light'}
                  >
                    <Check size={12} />
                  </ThemeIcon>
                  <Text size="sm" fw={500}>Ready for Review</Text>
                </Group>
              </Stack>
            )}
          </Stack>
        </Paper>

        {/* Rest of appointment details */}
        <Stack gap="xs">
          <Text fw={500}>Appointment details</Text>
          
          <Group align="center" gap="xs">
            <input type="checkbox" disabled />
            <Text size="sm">All day</Text>
          </Group>

          <TextInput
            label="Date"
            value={format(appointment.start, 'MM/dd/yyyy')}
            readOnly
          />

          <Group grow>
            <TextInput
              label="Start Time"
              value={format(appointment.start, 'hh:mm a')}
              readOnly
            />
            <Text size="sm" mt={28}>to</Text>
            <TextInput
              label="End Time"
              value={format(appointment.end, 'hh:mm a')}
              readOnly
            />
            <Text size="sm" mt={28}>{duration} mins</Text>
          </Group>

          <Stack gap="xs">
            <Text fw={500}>Clinician</Text>
            <Group gap="xs">
              <User size={20} />
              <Text size="sm">Albert Wong (You)</Text>
            </Group>
          </Stack>

          <Select
            label="Location"
            data={['Online Services']}
            value="Online Services"
            readOnly
          />

          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={500}>Notes</Text>
              <Group>
                <Button variant="subtle" color="blue" size="xs">Add Note</Button>
              </Group>
            </Group>
            <Group gap="xs">
              <Text size="sm" c="blue">10/30/2024</Text>
              <Text size="sm" c="blue">10/23/2024</Text>
            </Group>
          </Stack>

          <Stack gap="xs">
            <Text fw={500}>Add services and modifiers</Text>
            <Select
              data={['90837 Individual Psychotherapy, Standard Session']}
              value="90837 Individual Psychotherapy, Standard Session"
              readOnly
            />
            <Group>
              <Badge>95</Badge>
              <Badge variant="outline">AA</Badge>
              <Badge variant="outline">AA</Badge>
              <Badge variant="outline">AA</Badge>
              <Text>Fee</Text>
              <Text fw={500}>$220</Text>
            </Group>
            <Button variant="subtle" color="blue" fullWidth leftSection={<Text size="lg">+</Text>}>
              Service
            </Button>
          </Stack>

          <Group justify="space-between" mt="sm">
            <Text>Billing Type</Text>
            <Text>Self-pay</Text>
          </Group>

          <Group justify="space-between">
            <Text>Appointment Total</Text>
            <Text fw={500}>$220</Text>
          </Group>

          <Group gap="xs">
            <Text c="blue">INV #2976</Text>
            <Badge color="green">Paid</Badge>
          </Group>

          <Text size="sm">Enrolled in AutoPay</Text>
          <Text size="sm">
            Client's credit card will be charged for any outstanding balance overnight.{' '}
            <Text component="span" c="blue" style={{ cursor: 'pointer' }}>
              Add payment now.
            </Text>
          </Text>

          <Text>Client Balance: $0</Text>
        </Stack>

        <Group justify="flex-end" mt="xl">
          <Button variant="subtle" color="gray" size="sm">
            <User size={16} />
          </Button>
          <Button variant="light" onClick={onClose}>Cancel</Button>
          <Button onClick={onClose}>Done</Button>
        </Group>
      </Stack>
    </Modal>
  );
}