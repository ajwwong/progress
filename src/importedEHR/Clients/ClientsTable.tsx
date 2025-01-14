import { Paper, Group, Text, ActionIcon, Stack, Badge, Menu } from '@mantine/core';
import { MoreHorizontal, Mail, Phone, X } from 'lucide-react';
import type { Client } from './types';

interface ClientsTableProps {
  clients: Client[];
  onClientClick: (clientName: string) => void;
}

export function ClientsTable({ clients, onClientClick }: ClientsTableProps) {
  return (
    <Paper withBorder>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Contact info</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Relationship</th>
            <th style={{ padding: '1rem', textAlign: 'right' }}>Manage</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr 
              key={client.id}
              style={{ 
                borderBottom: '1px solid var(--mantine-color-gray-3)',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'var(--mantine-color-gray-0)'
                }
              }}
            >
              <td style={{ padding: '1rem' }}>
                <Group gap="sm">
                  <Text 
                    c="blue" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => onClientClick(client.name)}
                  >
                    {client.name}
                  </Text>
                  <Badge size="sm">{client.type}</Badge>
                </Group>
              </td>
              <td style={{ padding: '1rem' }}>
                <Stack gap="xs">
                  <Group gap="xs">
                    <Text>{client.phone}</Text>
                    <Badge size="sm" variant="outline">{client.phoneType}</Badge>
                    <ActionIcon variant="subtle" size="sm">
                      <X size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" size="sm">
                      <Phone size={14} />
                    </ActionIcon>
                  </Group>
                  <Group gap="xs">
                    <Text>{client.email}</Text>
                    <Badge size="sm" variant="outline">{client.emailType}</Badge>
                    <ActionIcon variant="subtle" size="sm">
                      <Mail size={14} />
                    </ActionIcon>
                  </Group>
                </Stack>
              </td>
              <td style={{ padding: '1rem' }}>
                <Text>Clinician: {client.clinician}</Text>
              </td>
              <td style={{ padding: '1rem', textAlign: 'right' }}>
                <Menu>
                  <Menu.Target>
                    <ActionIcon variant="subtle">
                      <MoreHorizontal size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item>Edit</Menu.Item>
                    <Menu.Item>Delete</Menu.Item>
                    <Menu.Item>View Profile</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Paper>
  );
}