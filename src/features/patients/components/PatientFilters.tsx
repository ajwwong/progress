import { Group, TextInput, Select } from '@mantine/core';
import { IconSearch, IconUsers, IconShield, IconClock } from '@tabler/icons-react';

interface PatientFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  patientStatus: string;
  onPatientStatusChange: (value: string) => void;
  insuranceStatus: string;
  onInsuranceStatusChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
}

export function PatientFilters({
  searchTerm,
  onSearchChange,
  patientStatus,
  onPatientStatusChange,
  insuranceStatus,
  onInsuranceStatusChange,
  sortBy,
  onSortByChange
}: PatientFiltersProps) {
  return (
    <Group>
      <TextInput
        placeholder="Search patients..."
        leftSection={<IconSearch size={16} />}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        style={{ flex: 1 }}
      />
      <Select
        leftSection={<IconUsers size={16} />}
        placeholder="Patient Status"
        data={[
          { value: 'all', label: 'All Patients' },
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'pending', label: 'Pending Intake' }
        ]}
        value={patientStatus}
        onChange={(value) => onPatientStatusChange(value || 'all')}
      />
      <Select
        leftSection={<IconShield size={16} />}
        placeholder="Insurance Status"
        data={[
          { value: 'all', label: 'All Insurance' },
          { value: 'verified', label: 'Verified' },
          { value: 'pending', label: 'Pending' },
          { value: 'expired', label: 'Expired' }
        ]}
        value={insuranceStatus}
        onChange={(value) => onInsuranceStatusChange(value || 'all')}
      />
      <Select
        leftSection={<IconClock size={16} />}
        placeholder="Sort By"
        data={[
          { value: 'last-updated', label: 'Last Updated' },
          { value: 'last-session', label: 'Last Session' },
          { value: 'name', label: 'Patient Name' }
        ]}
        value={sortBy}
        onChange={(value) => onSortByChange(value || 'last-updated')}
      />
    </Group>
  );
}
