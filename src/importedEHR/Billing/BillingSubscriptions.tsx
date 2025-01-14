import { 
  Container, 
  Title, 
  Paper, 
  Stack, 
  Group, 
  Text, 
  Button, 
  Tabs,
  ThemeIcon,
  Badge,
  Progress,
  ActionIcon,
  Menu,
  Card,
  List,
  Grid,
  Divider
} from '@mantine/core';
import { 
  CreditCard, 
  Clock, 
  Download, 
  ChevronRight, 
  Check, 
  Plus,
  Receipt,
  History,
  Settings,
  AlertCircle,
  FileText,
  Shield
} from 'lucide-react';

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending' | 'failed';
}

const invoices: Invoice[] = [
  { id: 'INV-2024-001', date: '2024-02-01', amount: '$99.00', status: 'paid' },
  { id: 'INV-2024-002', date: '2024-01-01', amount: '$99.00', status: 'paid' },
  { id: 'INV-2023-012', date: '2023-12-01', amount: '$99.00', status: 'paid' },
];

function PaymentMethodCard() {
  return (
    <Card withBorder p="lg">
      <Group position="apart" mb="md">
        <Group>
          <ThemeIcon size="lg" variant="light" color="blue">
            <CreditCard size={18} />
          </ThemeIcon>
          <Stack gap={0}>
            <Text fw={500}>Credit Card</Text>
            <Text size="sm" c="dimmed">Visa ending in 4242</Text>
          </Stack>
        </Group>
        <Badge color="green">Primary</Badge>
      </Group>
      <Group>
        <Text size="sm">Expires 12/2025</Text>
        <Button variant="subtle" size="xs">Update</Button>
      </Group>
    </Card>
  );
}

function SubscriptionCard() {
  return (
    <Card withBorder p="lg">
      <Stack gap="md">
        <Group position="apart">
          <Group>
            <ThemeIcon size="xl" variant="light" color="blue" radius="md">
              <Shield size={22} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="lg" fw={600}>Professional Plan</Text>
              <Text size="sm" c="dimmed">$99/month</Text>
            </Stack>
          </Group>
          <Badge color="green" size="lg">Active</Badge>
        </Group>

        <Divider />

        <List spacing="sm" size="sm">
          <List.Item icon={<Check size={16} />}>Unlimited clients</List.Item>
          <List.Item icon={<Check size={16} />}>All premium features</List.Item>
          <List.Item icon={<Check size={16} />}>Priority support</List.Item>
          <List.Item icon={<Check size={16} />}>HIPAA compliance</List.Item>
        </List>

        <Button variant="light" color="blue">Change Plan</Button>
      </Stack>
    </Card>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  return (
    <Paper withBorder p="md" mb="sm">
      <Group position="apart">
        <Group>
          <ThemeIcon size="lg" variant="light" color="blue">
            <Receipt size={18} />
          </ThemeIcon>
          <Stack gap={2}>
            <Text fw={500}>{invoice.id}</Text>
            <Text size="sm" c="dimmed">{invoice.date}</Text>
          </Stack>
        </Group>

        <Group>
          <Text fw={500}>{invoice.amount}</Text>
          <Badge 
            color={invoice.status === 'paid' ? 'green' : 
                  invoice.status === 'pending' ? 'yellow' : 'red'}
          >
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </Badge>
          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <ActionIcon variant="subtle">
                <ChevronRight size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<Download size={14} />}>Download PDF</Menu.Item>
              <Menu.Item leftSection={<FileText size={14} />}>View Details</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Paper>
  );
}

export function BillingSubscriptions() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={2}>Billing & Subscriptions</Title>
            <Text c="dimmed">Manage your subscription, payment methods, and billing history</Text>
          </Stack>
          <Button leftSection={<Download size={16} />}>Download Statement</Button>
        </Group>

        <Grid>
          <Grid.Col span={8}>
            <Stack gap="xl">
              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Group position="apart">
                    <Title order={4}>Current Subscription</Title>
                    <Badge size="lg" variant="dot" color="green">Active</Badge>
                  </Group>
                  <SubscriptionCard />
                </Stack>
              </Paper>

              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Group position="apart">
                    <Title order={4}>Payment Methods</Title>
                    <Button variant="light" leftSection={<Plus size={16} />}>
                      Add Payment Method
                    </Button>
                  </Group>
                  <PaymentMethodCard />
                </Stack>
              </Paper>

              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Group position="apart">
                    <Title order={4}>Billing History</Title>
                    <Button variant="subtle" rightSection={<ChevronRight size={16} />}>
                      View All
                    </Button>
                  </Group>
                  {invoices.map((invoice) => (
                    <InvoiceRow key={invoice.id} invoice={invoice} />
                  ))}
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>

          <Grid.Col span={4}>
            <Stack gap="md">
              <Paper withBorder p="xl">
                <Stack gap="md">
                  <Title order={4}>Quick Actions</Title>
                  <Button 
                    variant="light" 
                    fullWidth 
                    leftSection={<History size={16} />}
                  >
                    View Payment History
                  </Button>
                  <Button 
                    variant="light" 
                    fullWidth 
                    leftSection={<Settings size={16} />}
                  >
                    Billing Settings
                  </Button>
                  <Button 
                    variant="light" 
                    fullWidth 
                    leftSection={<AlertCircle size={16} />}
                  >
                    Billing Support
                  </Button>
                </Stack>
              </Paper>

              <Paper withBorder p="xl">
                <Stack gap="md">
                  <Title order={4}>Usage Overview</Title>
                  <Stack gap="xs">
                    <Group position="apart">
                      <Text size="sm">Active Clients</Text>
                      <Text size="sm" fw={500}>482/500</Text>
                    </Group>
                    <Progress 
                      value={96.4} 
                      size="sm"
                      color="blue"
                    />
                  </Stack>
                  <Stack gap="xs">
                    <Group position="apart">
                      <Text size="sm">Storage Used</Text>
                      <Text size="sm" fw={500}>15.2/20 GB</Text>
                    </Group>
                    <Progress 
                      value={76} 
                      size="sm"
                      color="blue"
                    />
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}