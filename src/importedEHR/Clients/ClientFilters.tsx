import { Group, TextInput, Select } from '@mantine/core';
import { Search, Users, Shield } from 'lucide-react';

interface ClientFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  clientType: string;
  onClientTypeChange: (value: string) => void;
  insuranceType: string;
  onInsuranceTypeChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
}

export function ClientFilters({
  searchTerm,
  onSearchChange,
  clientType,
  onClientTypeChange,
  insuranceType,
  onInsuranceTypeChange,
  sortBy,
  onSortByChange
}: ClientFiltersProps) {
  return (
    <Group>
      <TextInput
        placeholder="Search"
        leftSection={<Search size={16} />}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        style={{ flex: 1 }}
      />
      <Select
        leftSection={<Users size={16} />}
        placeholder="Clients"
        data={[
          { value: 'all', label: 'All Clients' },
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ]}
        value={clientType}
        onChange={(value) => onClientTypeChange(value || 'all')}
      />
      <Select
        leftSection={<Shield size={16} />}
        placeholder="Insurance payer"
        data={[
          { value: 'all', label: 'All Insurance' },
          { value: 'self-pay', label: 'Self Pay' },
          { value: 'insurance', label: 'Insurance' }
        ]}
        value={insuranceType}
        onChange={(value) => onInsuranceTypeChange(value || 'all')}
      />
      <Select
        placeholder="Sort: last name"
        data={[
          { value: 'last-name', label: 'Last name' },
          { value: 'first-name', label: 'First name' },
          { value: 'recent', label: 'Most recent' }
        ]}
        value={sortBy}
        onChange={(value) => onSortByChange(value || 'last-name')}
      />
    </Group>
  );
}