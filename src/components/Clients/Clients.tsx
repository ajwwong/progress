import { Container, Title, Group, Paper, Stack, Switch, Badge } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientFilters } from './ClientFilters';
import { ClientsTable } from './ClientsTable';
import { sampleClients } from './types';

export function Clients() {
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showCouples, setShowCouples] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientType, setClientType] = useState<string>('all');
  const [insuranceType, setInsuranceType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('last-name');
  const navigate = useNavigate();

  const handleClientClick = (clientName: string) => {
    navigate(`/patients/${encodeURIComponent(clientName)}`);
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={2}>Clients and contacts</Title>
          <Group>
            <Badge size="lg" variant="outline">Total Clients: 482</Badge>
          </Group>
        </Group>

        <Paper p="md" radius="sm" withBorder>
          <Stack gap="sm">
            <Group>
              <Switch 
                label="Show 94 possible duplicate clients or contacts"
                checked={showDuplicates}
                onChange={(e) => setShowDuplicates(e.currentTarget.checked)}
              />
            </Group>
            <Group>
              <Switch
                label="Show 24 potential Couples"
                checked={showCouples}
                onChange={(e) => setShowCouples(e.currentTarget.checked)}
              />
            </Group>
          </Stack>
        </Paper>

        <ClientFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          clientType={clientType}
          onClientTypeChange={setClientType}
          insuranceType={insuranceType}
          onInsuranceTypeChange={setInsuranceType}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />

        <ClientsTable
          clients={sampleClients}
          onClientClick={handleClientClick}
        />
      </Stack>
    </Container>
  );
}