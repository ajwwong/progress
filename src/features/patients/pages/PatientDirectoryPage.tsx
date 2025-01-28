import { Group, Title, Text, Anchor,Button, Stack, Box, ActionIcon, TextInput, Modal, Paper, Menu, Table, Select, Container } from '@mantine/core';
import { Patient } from '@medplum/fhirtypes';
import { ResourceName, useMedplum, useMedplumNavigate } from '@medplum/react';
import { IconSearch, IconPhone, IconMail, IconDotsVertical, IconPlus } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { PatientFilters } from '../components/PatientFilters';
import { CreatePatientModal } from '../../../components/modals/CreatePatientModal';
import { PatientModal } from '../../../components/calendar/PatientModal';

const theme = {
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
      },
    },
    Paper: {
      defaultProps: {
        shadow: 'xs',
        radius: 'md',
      },
    },
  },
};

export function PatientDirectoryPage(): JSX.Element {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientStatus, setClientStatus] = useState('active');
  const [insurancePayer, setInsurancePayer] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSessions, setLastSessions] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const patientsPerPage = 100;
  const medplum = useMedplum();
  const navigate = useMedplumNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

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
  
  const getLastSession = async (patientId: string): Promise<string> => {
    try {
      const appointments = await medplum.searchResources('Appointment', {
        patient: `Patient/${patientId}`,
        _sort: '-date',
        _count: 1,
        date: `lt${new Date().toISOString()}`
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
        searchParams.push(`name:contains=${query}`);
      }
      
      if (clientStatus !== 'all') {
        if (clientStatus === 'active') {
          searchParams.push('active=true');
        }
      }
      
      searchParams.push(`_sort=family`);
      
      searchParams.push(`_count=${patientsPerPage}`);
      searchParams.push(`_offset=${(currentPage - 1) * patientsPerPage}`);
      
      const searchString = searchParams.join('&');
      
      const results = await medplum.searchResources('Patient', searchString);
      
      setPatients(results);
      
      const total = results.length > 0 ? (results as any).total || results.length : 0;
      setTotalPages(Math.max(1, Math.ceil(total / patientsPerPage)));
      
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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPatients(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, clientStatus, insurancePayer, currentPage]);

  useEffect(() => {
    loadPatients('');
  }, []);

  const handleCreatePatient = async (patientName: string) => {
    try {
      const [firstName, ...restName] = patientName.split(' ');
      const lastName = restName.join(' ');

      const newPatient = await medplum.createResource('Patient', {
        resourceType: 'Patient',
        name: [{
          given: [firstName],
          family: lastName
        }],
        active: true
      });

      notifications.show({
        title: 'Success',
        message: 'Patient created successfully',
        color: 'green',
      });

      // Refresh the patient list
      loadPatients(searchQuery);
      
    } catch (error) {
      console.error('Error creating patient:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create patient',
        color: 'red',
      });
    }
  };

  const handlePatientCreated = () => {
    loadPatients(searchQuery);
    setIsPatientModalOpen(false);
  };

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    
    setIsLoading(true);
    try {
      await medplum.deleteResource('Patient', patientToDelete);
      notifications.show({
        title: 'Success',
        message: 'Patient deleted successfully',
        color: 'green',
      });
      loadPatients(searchQuery);
    } catch (err) {
      console.error('Error deleting patient:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete patient',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
      setDeleteModalOpen(false);
      setPatientToDelete(null);
      setDeleteConfirmName('');
    }
  };

  const patientHasActiveField = (patientId: string): boolean => {
    const patient = patients.find((p) => p.id === patientId);
    return patient?.hasOwnProperty('active') ?? false;
  };

  const handleTogglePatientStatus = async (patientId: string, currentStatus: boolean) => {
    setIsLoading(true);
    try {
      const patch: PatchOperation[] = [
        {
          op: patientHasActiveField(patientId) ? 'replace' : 'add',
          path: '/active',
          value: !currentStatus,
        },
      ];

      await medplum.patchResource('Patient', patientId, patch);

      notifications.show({
        title: 'Success',
        message: `Patient ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
        color: 'green',
      });

      // Update the local state without refetching all patients
      setPatients((prevPatients) =>
        prevPatients.map((patient) =>
          patient.id === patientId ? { ...patient, active: !currentStatus } : patient
        )
      );
    } catch (err) {
      console.error('Error updating patient status:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to update patient status',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size="xl">
      <Box p="md">
        <Stack spacing="xl">
          <Group justify="space-between" mb="lg">
            <Group gap="sm">
              <Title order={2}>Patients</Title>
              <Button
                variant="filled"
                color="blue"
                size="md"
                radius="md"
                leftSection={<IconPlus size={18} />}
                onClick={() => setIsPatientModalOpen(true)}
                styles={(theme) => ({
                  root: {
                    fontWeight: 600,
                    boxShadow: theme.shadows.xs,
                    transition: 'all 150ms ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: theme.shadows.sm,
                    }
                  }
                })}
              >
                Add Patient
              </Button>
            </Group>
          </Group>

          <Group align="flex-end" spacing="md">
            <TextInput
              placeholder="Search patients by name..."
              size="md"
              radius="md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={16} style={{ color: 'var(--mantine-color-gray-5)' }} />}
              disabled={isLoading}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Status"
              data={[
                { value: 'all', label: 'All Patients' },
                { value: 'active', label: 'Active' }
              ]}
              value={clientStatus}
              onChange={setClientStatus}
              size="md"
              radius="md"
              style={{ width: 200 }}
            />
           
          </Group>

          {/* Patient List */}
          <Paper withBorder>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '25%' }}>Name</Table.Th>
                  <Table.Th style={{ width: '15%' }}>Status</Table.Th>
                  <Table.Th style={{ width: '30%' }}>Contact Info</Table.Th>
                  <Table.Th style={{ width: '10%' }}>Manage</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {patients.map((patient) => (
                  <Table.Tr key={patient.id}>
                    <Table.Td>
                    <Anchor
      href="#"
      onClick={(e) => {
        e.preventDefault();
        navigate(`/patient/${patient.id}`);
      }}
      sx={(theme) => ({
        fontWeight: 500,
      })}
    >
      <ResourceName value={patient} />
    </Anchor>
                    </Table.Td>
                    <Table.Td>
                      <Button 
                        size="xs" 
                        variant="light" 
                        color={patient.active ? "green" : "gray"}
                      >
                        {patient.active ? "Active" : "Inactive"}
                      </Button>
                    </Table.Td>
                    <Table.Td>
                      <Stack spacing={4}>
                        {patient.telecom?.filter(t => t.system && t.value).map((t, i) => (
                          <Group key={i} spacing={6}>
                            {t.system === 'phone' && <IconPhone size={14} />}
                            {t.system === 'email' && <IconMail size={14} />}
                            <Text size="sm">{t.value}</Text>
                          </Group>
                        ))}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <ActionIcon 
                            variant="subtle" 
                            color="gray"
                            size="sm"
                            radius="xl"
                          >
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            onClick={() => navigate(`/patient/${patient.id}`)}
                          >
                            View Profile
                          </Menu.Item>
                          <Menu.Item
                            onClick={() => handleTogglePatientStatus(patient.id as string, patient.active === true)}
                          >
                            {patient.active ? 'Make Inactive' : 'Make Active'}
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            onClick={() => {
                              setPatientToDelete(patient.id as string);
                              setDeleteModalOpen(true);
                            }}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Stack>


        <PatientModal
          opened={isPatientModalOpen}
          onClose={() => setIsPatientModalOpen(false)}
          onSuccess={handlePatientCreated}
        />

        <Modal
          opened={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setPatientToDelete(null);
            setDeleteConfirmName('');
          }}
          title={<Text size="lg" fw={500} c="red">Delete Patient</Text>}
          centered
        >
          <Stack spacing="md">
            <Text>
              Are you sure you want to delete this patient? This action cannot be undone.
            </Text>
            <Text size="sm">
              Please type "DELETE" to confirm:
            </Text>
            <TextInput
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.currentTarget.value)}
              placeholder='Type "DELETE" here'
            />
            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setPatientToDelete(null);
                  setDeleteConfirmName('');
                }}
              >
                Cancel
              </Button>
              <Button
                color="red"
                loading={isLoading}
                onClick={handleDeletePatient}
                disabled={deleteConfirmName !== 'DELETE'}
              >
                Delete Patient
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Box>
      </Container>
    );
  }
