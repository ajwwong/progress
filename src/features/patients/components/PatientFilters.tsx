import { Group, TextInput, Select, Stack } from '@mantine/core';
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
    <Stack spacing="md">
      <TextInput
        placeholder="Search patients by name..."
        leftSection={<IconSearch size={16} />}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        size="md"
      />
      <Group grow spacing="md">
        <Select
          leftSection={<IconUsers size={16} />}
          placeholder="Status"
          data={[
            { value: 'all', label: 'All Patients' },
            { value: 'active', label: 'Active' }
          ]}
          value={patientStatus}
          onChange={(value) => onPatientStatusChange(value || 'all')}
          size="md"
        />
        <Select
          leftSection={<IconShield size={16} />}
          placeholder="Insurance"
          data={[
            { value: 'all', label: 'All Insurance' },
            { value: 'verified', label: 'Verified' },
            { value: 'pending', label: 'Pending' },
            { value: 'expired', label: 'Expired' }
          ]}
          value={insuranceStatus}
          onChange={(value) => onInsuranceStatusChange(value || 'all')}
          size="md"
        />
        <Select
          leftSection={<IconClock size={16} />}
          placeholder="Sort"
          data={[
            { value: 'most-recent', label: 'Most Recent' },
            { value: 'name', label: 'Patient Name' },
            { value: 'last-updated', label: 'Last Updated' }
          ]}
          value={sortBy}
          onChange={(value) => onSortByChange(value || 'last-updated')}
          size="md"
        />
      </Group>
    </Stack>
  );
}
