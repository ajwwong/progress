import { Group, Title, Text, Button, Stack, Box, Checkbox, ActionIcon, TextInput, Modal } from '@mantine/core';
import { Patient, Appointment } from '@medplum/fhirtypes';
import { Document, ResourceName, ResourceAvatar, useMedplum, useMedplumNavigate } from '@medplum/react';
import { IconPlus, IconTrash, IconSearch, IconPhone, IconMail } from '@tabler/icons-react';
import { useState, useCallback, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { calculateAgeString, getDisplayString } from '@medplum/core';
import { PatientFilters } from '../components/PatientFilters';

interface PatientStatus {
  lastSession: string;
  nextAppointment: string;
  sessionsRemaining: number;
  progressNotesPending: boolean;
  treatmentPlanDue: string | null;
  insuranceStatus: 'verified' | 'pending' | 'expired';
  outstandingBalance: number;
  requiredForms: {
    total: number;
    completed: number;
  };
}

export function PatientDirectoryPage(): JSX.Element {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSessions, setLastSessions] = useState<Record<string, string>>({});
  const [patientStatuses, setPatientStatuses] = useState<Record<string, PatientStatus>>({});
  const navigate = useMedplumNavigate();
  const medplum = useMedplum();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [patientStatus, setPatientStatus] = useState('all');
  const [insuranceStatus, setInsuranceStatus] = useState('all');
  const [sortBy, setSortBy] = useState('last-updated');

  const getLastSession = async (patientId: string): Promise<string> => {
    try {
      const pastFilter = {
        code: 'date',
        operator: 'eb', // ends-before
        value: new Date().toISOString(),
      };

      const appointments = await medplum.searchResources('Appointment', {
        patient: `Patient/${patientId}`,
        _sort: '-date',
        _count: 1,
        date: `lt${new Date().toISOString()}` // less than current date
      });
      
      if (appointments[0]?.start) {
        return appointments[0].start;
      }
      return '';
    } catch (err) {
      console.error('Error fetching last session:', err);
      return '';
    }
  };

  const loadPatients = async (query: string) => {
    setIsLoading(true);
    try {
      let searchParams = [];
      
      // Add name search
      if (query.trim()) {
        searchParams.push(`name:contains=${query}`);
      }
      
      // Add status filter
      if (patientStatus !== 'all') {
        searchParams.push(`active=${patientStatus === 'active'}`);
      }
      
      // Add insurance status filter
      if (insuranceStatus !== 'all') {
        searchParams.push(`insurance-status=${insuranceStatus}`);
      }
      
      // Add sorting
      const sortParam = sortBy === 'name' ? '_sort=family' : '_sort=-_lastUpdated';
      searchParams.push(sortParam);
      
      const searchString = searchParams.join('&');
      const results = await medplum.searchResources('Patient', searchString);
      
      setPatients(results);

      // Fetch last sessions for all patients
      const sessions: Record<string, string> = {};
      await Promise.all(
        results.map(async (patient) => {
          if (patient.id) {
            sessions[patient.id] = await getLastSession(patient.id);
          }
        })
      );
      setLastSessions(sessions);
    } catch (err) {
      console.error('Error searching patients:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to load patients',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Use useEffect for search with delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPatients(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, patientStatus, insuranceStatus, sortBy]);

  // Initial load
  useEffect(() => {
    loadPatients('');
  }, []);

  const getPatientToDeleteName = () => {
    if (selectedPatients.length !== 1) return '';
    const patient = patients.find(p => p.id === selectedPatients[0]);
    return patient ? getDisplayString(patient) : '';
  };

  const handleDeletePatients = async () => {
    const patientName = getPatientToDeleteName();
    if (deleteConfirmName !== patientName) {
      notifications.show({
        title: 'Error',
        message: 'Patient name does not match',
        color: 'red',
      });
      return;
    }

    setIsLoading(true);
    try {
      await Promise.all(
        selectedPatients.map(id => 
          medplum.deleteResource('Patient', id)
        )
      );
      
      notifications.show({
        title: 'Success',
        message: 'Selected patients deleted',
        color: 'green',
      });
      
      setSelectedPatients([]);
      setDeleteModalOpen(false);
      setDeleteConfirmName('');
      loadPatients(searchQuery);
    } catch (err) {
      console.error('Error deleting patients:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete patients',
        color: 'red',
      });
    }
    setIsLoading(false);
  };

  const togglePatientSelection = (patientId: string) => {
    setSelectedPatients(prev => 
      prev.includes(patientId) 
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
  };

  const formatLastSession = (date: string) => {
    if (!date) return 'No sessions yet';
    const sessionDate = new Date(date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - sessionDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return sessionDate.toLocaleDateString();
  };

  const loadPatientStatus = async (patientId: string): Promise<PatientStatus> => {
    try {
      // Get next appointment
      const futureAppointments = await medplum.searchResources('Appointment', {
        patient: `Patient/${patientId}`,
        date: `gt${new Date().toISOString()}`,
        _count: 1,
        _sort: 'date'
      });

      // Get progress notes status using Composition
      const pendingNotes = await medplum.searchResources('Composition', {
        patient: `Patient/${patientId}`,
        status: 'preliminary',
        type: 'progress-note',
        _count: 1
      });

      // Get CarePlan status for treatment plan
      const carePlan = await medplum.searchResources('CarePlan', {
        patient: `Patient/${patientId}`,
        status: 'active',
        _count: 1,
        _sort: '-date'
      });

      return {
        lastSession: await getLastSession(patientId),
        nextAppointment: futureAppointments[0]?.start || '',
        sessionsRemaining: 12, // This would come from insurance auth tracking
        progressNotesPending: pendingNotes.length > 0,
        treatmentPlanDue: carePlan[0]?.period?.end || null,
        insuranceStatus: 'verified',
        outstandingBalance: 0,
        requiredForms: {
          total: 5,
          completed: 3
        }
      };
    } catch (err) {
      console.error('Error loading patient status:', err);
      return {
        lastSession: '',
        nextAppointment: '',
        sessionsRemaining: 0,
        progressNotesPending: false,
        treatmentPlanDue: null,
        insuranceStatus: 'pending',
        outstandingBalance: 0,
        requiredForms: { total: 0, completed: 0 }
      };
    }
  };

  return (
    <Document>
      <Box style={{ maxWidth: '95vw', margin: '0 auto' }}>
        <Stack spacing="xl">
          <Group justify="space-between" align="center">
            <Title order={1} style={{ color: 'var(--mantine-color-blue-9)' }}>Patients</Title>
            <Group>
              <ActionIcon 
                color="red"
                variant="subtle"
                disabled={selectedPatients.length === 0 || isLoading}
                onClick={() => setDeleteModalOpen(true)}
                loading={isLoading}
              >
                <IconTrash size={16} />
              </ActionIcon>
              <Button 
                variant="filled"
                leftSection={<IconPlus size={14} />}
                onClick={() => navigate('/patients/new')}
                disabled={isLoading}
              >
                Add patient
              </Button>
            </Group>
          </Group>

          <PatientFilters
            searchTerm={searchQuery}
            onSearchChange={setSearchQuery}
            patientStatus={patientStatus}
            onPatientStatusChange={setPatientStatus}
            insuranceStatus={insuranceStatus}
            onInsuranceStatusChange={setInsuranceStatus}
            sortBy={sortBy}
            onSortByChange={setSortBy}
          />

          <Box>
            <Group 
              px="md" 
              py="xs" 
              style={{ 
                borderBottom: '1px solid var(--mantine-color-gray-3)',
                backgroundColor: 'var(--mantine-color-gray-0)'
              }}
            >
              <Checkbox style={{ width: '40px' }} />
              <Text fw={500} style={{ width: '200px' }}>Name</Text>
              <Text fw={500} style={{ width: '200px' }}>Contact</Text>
              <Text fw={500} style={{ flex: 1 }}>Last Session</Text>
              <Box style={{ width: '120px' }} /> {/* Space for action button */}
            </Group>

            {patients.map((patient) => (
              <Group 
                key={patient.id} 
                px="md" 
                py="sm"
                style={{ 
                  borderBottom: '1px solid var(--mantine-color-gray-2)',
                  '&:hover': {
                    backgroundColor: 'var(--mantine-color-gray-0)'
                  }
                }}
                onClick={() => navigate(`/patients/${patient.id}`)}
              >
                <Checkbox
                  style={{ width: '40px' }}
                  checked={selectedPatients.includes(patient.id as string)}
                  onChange={(e) => {
                    e.stopPropagation();
                    togglePatientSelection(patient.id as string);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <Group style={{ width: '200px' }} noWrap>
                  <ResourceAvatar value={patient} size="md" radius="xl" />
                  <div>
                    <Text fw={500}><ResourceName value={patient} /></Text>
                    {patient.birthDate && (
                      <Text size="xs" c="dimmed">
                        {patient.birthDate} ({calculateAgeString(patient.birthDate)})
                      </Text>
                    )}
                  </div>
                </Group>
                <Box style={{ width: '200px' }}>
                  {patient.telecom?.map((t, index) => (
                    <Text key={index} size="sm" c="dimmed">
                      {t.value}
                    </Text>
                  ))}
                </Box>
                <Text style={{ flex: 1 }} c="dimmed">
                  {formatLastSession(lastSessions[patient.id as string])}
                </Text>
                <Button
                  variant="light"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/calendar/new?patient=${patient.id}`);
                  }}
                  style={{ width: '120px' }}
                >
                  New Session
                </Button>
              </Group>
            ))}
          </Box>

          <Modal
            opened={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setDeleteConfirmName('');
            }}
            title={<Text size="lg" fw={500} c="red">Delete Patient</Text>}
            centered
          >
            <Stack spacing="md">
              <Text>
                Are you sure you want to delete{' '}
                <Text span fw={500}>{getPatientToDeleteName()}</Text>?
                This action cannot be undone.
              </Text>
              <Text size="sm">
                Please type the patient's full name to confirm:
              </Text>
              <TextInput
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.currentTarget.value)}
                placeholder="Type patient name here"
              />
              <Group justify="flex-end">
                <Button
                  variant="light"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeleteConfirmName('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  color="red"
                  loading={isLoading}
                  onClick={handleDeletePatients}
                  disabled={deleteConfirmName !== getPatientToDeleteName()}
                >
                  Delete Patient
                </Button>
              </Group>
            </Stack>
          </Modal>
        </Stack>
      </Box>
    </Document>
  );
}