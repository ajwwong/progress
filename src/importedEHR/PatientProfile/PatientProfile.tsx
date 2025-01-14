import { Container, Title, Group, Stack, Text, Button, Tabs, TextInput, Badge, Paper, ActionIcon, Box } from '@mantine/core';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, FileText, Activity, Files, Plus, Mail, Phone, X } from 'lucide-react';

export function PatientProfile() {
  const { patientName } = useParams();

  // Dummy data
  const patient = {
    name: decodeURIComponent(patientName || ''),
    type: 'Adult',
    dateOfBirth: '10/01/1970',
    age: '54',
    phone: '(555) 123-4567',
    phoneType: 'Mobile',
    email: 'client.email@email.com',
    emailType: 'Home',
    address: '1234 Therapy Lane',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90049-1731',
    billingCode: '90837',
    balance: '$0',
    unallocated: '$0',
    unpaidInvoices: '$0',
    appointments: [
      {
        date: 'AUG 12',
        status: 'Canceled',
        time: '3:00 PM – 3:50 PM',
        billingCode: '90837'
      },
      {
        date: 'AUG 5',
        status: 'Canceled',
        time: '3:00 PM – 3:50 PM',
        billingCode: '90837'
      },
      {
        date: 'JUL 29',
        status: 'Canceled',
        time: '3:00 PM – 3:50 PM',
        billingCode: '90837'
      }
    ]
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Breadcrumb */}
        <Group gap="xs">
          <Link to="/clients" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Group gap="xs">
              <ChevronLeft size={16} />
              <Text>Clients and contacts</Text>
            </Group>
          </Link>
          <Text c="dimmed">/</Text>
          <Text>{patient.name}'s profile</Text>
        </Group>

        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={2}>{patient.name}</Title>
            <Group gap="xs">
              <Badge>{patient.type}</Badge>
              <Text size="sm" c="dimmed">
                {patient.dateOfBirth} ({patient.age})
              </Text>
              <Button variant="subtle" size="xs">Schedule appointment</Button>
              <Button variant="subtle" size="xs">Edit</Button>
            </Group>
          </Stack>
          <Group>
            <Button variant="light">Share</Button>
            <Button variant="light">Upload</Button>
            <Button>Message</Button>
          </Group>
        </Group>

        <Group align="flex-start" style={{ flexWrap: 'nowrap' }}>
          {/* Main Content */}
          <Stack style={{ flex: 1 }}>
            <Tabs defaultValue="overview">
              <Tabs.List>
                <Tabs.Tab value="overview" leftSection={<FileText size={16} />}>
                  Overview
                </Tabs.Tab>
                <Tabs.Tab value="billing" leftSection={<Calendar size={16} />}>
                  Billing
                </Tabs.Tab>
                <Tabs.Tab value="measures" leftSection={<Activity size={16} />}>
                  Measures
                </Tabs.Tab>
                <Tabs.Tab value="files" leftSection={<Files size={16} />}>
                  Files
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="overview" pt="md">
                <Stack gap="md">
                  {/* Chart Notes */}
                  <Paper withBorder p="md">
                    <Stack gap="md">
                      <Group position="apart">
                        <Text fw={500}>Chart Notes</Text>
                        <Button variant="light" size="xs" leftSection={<Plus size={14} />}>
                          Add Note
                        </Button>
                      </Group>
                      <TextInput
                        placeholder="Add Chart Note: include notes from a call with a client or copy & paste the contents of a document or email."
                      />
                    </Stack>
                  </Paper>

                  {/* Appointments */}
                  <Paper withBorder p="md">
                    <Stack gap="md">
                      <Group position="apart">
                        <Text fw={500}>Appointments</Text>
                        <Group>
                          <Button variant="subtle" size="xs">All Time</Button>
                          <Button variant="subtle" size="xs">All Items</Button>
                          <Button size="xs">New</Button>
                        </Group>
                      </Group>
                      
                      {patient.appointments.map((apt, index) => (
                        <Paper key={index} withBorder p="md">
                          <Group position="apart">
                            <Group>
                              <Text fw={500}>{apt.date}</Text>
                              <Text>APPOINTMENT</Text>
                              <Badge color="red">Canceled</Badge>
                              <Text size="sm" c="dimmed">BILLING CODE: {apt.billingCode}</Text>
                            </Group>
                            <Text>{apt.time}</Text>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </Stack>

          {/* Sidebar */}
          <Box w={300}>
            <Stack gap="md">
              {/* Client Billing */}
              <Paper withBorder p="md">
                <Stack gap="sm">
                  <Text fw={500}>Client billing</Text>
                  <Group position="apart">
                    <Text>Client balance</Text>
                    <Text>{patient.balance}</Text>
                  </Group>
                  <Group position="apart">
                    <Text>Unallocated</Text>
                    <Text>{patient.unallocated}</Text>
                  </Group>
                  <Group position="apart">
                    <Text>Unpaid invoices</Text>
                    <Text>{patient.unpaidInvoices}</Text>
                  </Group>
                  <Text size="sm" c="blue">Appointment Status Report</Text>
                </Stack>
              </Paper>

              {/* AutoPay */}
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Group>
                    <Badge color="green">Enrolled in AutoPay</Badge>
                  </Group>
                  <Text size="sm">
                    Client's default card will be charged nightly for any outstanding balance.
                  </Text>
                  <Text size="sm" c="blue" style={{ cursor: 'pointer' }}>
                    Add a payment now
                  </Text>
                </Stack>
              </Paper>

              {/* Client Info */}
              <Paper withBorder p="md">
                <Stack gap="md">
                  <Group position="apart">
                    <Text fw={500}>Client info</Text>
                    <Button variant="subtle" size="xs">Edit</Button>
                  </Group>
                  
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Text>{patient.phone}</Text>
                      <Badge size="sm" variant="outline">{patient.phoneType}</Badge>
                      <ActionIcon variant="subtle" size="sm">
                        <X size={14} />
                      </ActionIcon>
                      <ActionIcon variant="subtle" size="sm">
                        <Phone size={14} />
                      </ActionIcon>
                    </Group>
                    <Group gap="xs">
                      <Text>{patient.email}</Text>
                      <Badge size="sm" variant="outline">{patient.emailType}</Badge>
                      <ActionIcon variant="subtle" size="sm">
                        <Mail size={14} />
                      </ActionIcon>
                    </Group>
                    <Text size="sm">
                      {patient.address}
                      <br />
                      {patient.city}, {patient.state} {patient.zip}
                    </Text>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Box>
        </Group>
      </Stack>
    </Container>
  );
}