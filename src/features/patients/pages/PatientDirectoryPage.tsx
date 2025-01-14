import { Group, Title, Text, Button, Stack, Box, Checkbox, ActionIcon, TextInput, Modal, Paper } from '@mantine/core';
import { Patient, Appointment } from '@medplum/fhirtypes';
import { Document, ResourceName, ResourceAvatar, useMedplum, useMedplumNavigate } from '@medplum/react';
import { IconPlus, IconTrash, IconSearch, IconPhone, IconMail, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
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
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const patientsPerPage = 40;

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
      
      if (query.trim()) {
        // Search by name OR telecom (email/phone)
        searchParams.push(`_filter=(name:contains=${query} or telecom:contains=${query})`);
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
      const sortParam = sortBy === 'name' ? '_sort=family' : sortBy === 'last-session' ? '_sort=-date' : '_sort=-_lastUpdated';
      searchParams.push(sortParam);
      
      // Add pagination
      searchParams.push(`_count=${patientsPerPage}`);
      searchParams.push(`_offset=${(currentPage - 1) * patientsPerPage}`);
      
      const searchString = searchParams.join('&');
      const results = await medplum.searchResources('Patient', searchString);
      
      // Update total pages calculation
      const total = results.length > 0 ? (results as any).total || results.length : 0;
      const calculatedTotalPages = Math.max(1, Math.ceil(total / patientsPerPage));
      setTotalPages(calculatedTotalPages);
      
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
  }, [searchQuery, patientStatus, insuranceStatus, sortBy, currentPage]);

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

  const toggleSelectAll = () => {
    if (selectedPatients.length === patients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(patients.map(p => p.id as string));
    }
  };

  return (
    <Document>
      <Box style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <Stack spacing="xl">
          {/* Header Section */}
          <Group position="apart" align="flex-end">
            <Stack spacing={4}>
              <Title order={1} style={{ color: 'var(--mantine-color-blue-9)' }}>Patients and Contacts</Title>
              <Text size="sm" c="dimmed">Manage your patients and sessions</Text>
            </Stack>
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
                onClick={() => navigate('/patient/new')}
                disabled={isLoading}
              >
                Add patient
              </Button>
            </Group>
          </Group>

          {/* Search and Filters */}
          <Paper p="md" radius="md" withBorder>
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
          </Paper>

          {/* Patient List */}
          <Paper radius="md" withBorder>
            {/* Header */}
            <Group 
              px="xl" 
              py="md" 
              style={{ 
                borderBottom: '1px solid var(--mantine-color-gray-3)',
                backgroundColor: 'var(--mantine-color-gray-0)'
              }}
            >
              <Checkbox 
                style={{ width: '40px', marginLeft: '12px' }}
                checked={selectedPatients.length === patients.length && patients.length > 0}
                indeterminate={selectedPatients.length > 0 && selectedPatients.length < patients.length}
                onChange={toggleSelectAll}
              />
              <Text fw={500} style={{ width: '250px' }}>Patient</Text>
              <Text fw={500} style={{ width: '200px' }}>Contact</Text>
              <Text fw={500} style={{ flex: 1 }}>Last Session</Text>
              <Box style={{ width: '140px' }} />
            </Group>

            {/* Patient Rows */}
            {patients.map((patient) => (
              <Paper 
                key={patient.id}
            
                p="md"
                withBorder
                sx={(theme) => ({
                  backgroundColor: 'white',
                  borderColor: theme.fn.lighten(theme.colors.gray[0], 0.1),
                  marginBottom: theme.spacing.xs,
                  padding: theme.spacing.md,
                  transition: 'background-color 200ms ease',
                  '&:hover': {
                    backgroundColor: 'var(--mantine-color-gray-1)',
                  }
                })}
              >
                <Group align="center" position="apart" spacing="xl">
                  <Group align="center" spacing="xl" style={{ flex: 1 }}>
                    <Checkbox
                      style={{ width: '40px', marginLeft: '16px' }}
                      checked={selectedPatients.includes(patient.id as string)}
                      onChange={(e) => togglePatientSelection(patient.id as string)}
                    />
                    <Stack spacing={8} style={{ width: '250px' }}>
                      <Text 
                        component="a" 
                        href={`/patient/${patient.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/patient/${patient.id}`);
                        }}
                        fw={900}
                        size="lg"
                        c="blue.8"
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { 
                            color: 'var(--mantine-color-blue-9)',
                            textDecoration: 'none'
                          }
                        }}
                      >
                        <ResourceName value={patient} />
                      </Text>
                      {patient.birthDate && (
                        <Text size="sm" c="dimmed">
                          {calculateAgeString(patient.birthDate)} old
                        </Text>
                      )}
                    </Stack>

                    <Stack spacing={10} style={{ width: '220px' }}>
                      {patient.telecom?.map((t, index) => (
                        <Group key={index} spacing={12} noWrap>
                          {t.system === 'phone' && <IconPhone size={18} color="var(--mantine-color-blue-6)" />}
                          {t.system === 'email' && <IconMail size={18} color="var(--mantine-color-blue-6)" />}
                          <Text size="sm" c="dimmed" truncate>
                            {t.value}
                          </Text>
                        </Group>
                      ))}
                    </Stack>

                    <Text style={{ flex: 1 }} c="dimmed" size="sm">
                      {formatLastSession(lastSessions[patient.id as string])}
                    </Text>
                  </Group>

                  <Button
                    variant="light"
                    size="sm"
                    color="blue"
                    onClick={() => navigate(`/calendar/new?patient=${patient.id}`)}
                    style={{ minWidth: '120px', marginRight: '16px' }}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'var(--mantine-color-blue-1)'
                      }
                    }}
                  >
                    New Session
                  </Button>
                </Group>
              </Paper>
            ))}
          </Paper>

          <Group position="center" mt="md">
            <ActionIcon 
              variant="light"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <IconChevronLeft size={16} />
            </ActionIcon>
            
            <Text size="sm">
              Page {currentPage} of {totalPages}
            </Text>
            
            <ActionIcon 
              variant="light"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              <IconChevronRight size={16} />
            </ActionIcon>
          </Group>

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