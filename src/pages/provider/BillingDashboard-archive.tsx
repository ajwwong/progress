import { Container, Grid, Paper, Stack, Group, Title, Text, Button, Progress, Badge } from '@mantine/core';
import { IconCreditCard, IconDownload, IconSettings, IconHistory, IconAlertCircle } from '@tabler/icons-react';
import { StripeConnect } from './StripeConnect';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Practitioner, Invoice } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';

export function BillingDashboard() {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Practitioner;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    medplum.searchResources('Invoice', {
      _sort: '-date',
      _count: '10'
    }).then(setInvoices)
      .finally(() => setLoading(false));
  }, [medplum]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={2}>Billing and Payments</Title>
            <Text c="dimmed">Manage your payment processing and billing settings</Text>
          </Stack>
          <Button leftSection={<IconDownload size={16} />}>Download Statement</Button>
        </Group>

        <Grid>
          <Grid.Col span={8}>
            <Stack gap="xl">
              <StripeConnect />

              <Paper withBorder p="xl">
                <Stack gap="lg">
                  <Group position="apart">
                    <Title order={4}>Payment History</Title>
                    <Button variant="subtle">View All</Button>
                  </Group>
                  
                  {invoices.map((invoice) => (
                    <Paper key={invoice.id} p="md" withBorder>
                      <Group position="apart">
                        <Stack spacing={4}>
                          <Text fw={500}>
                            {new Date(invoice.date || '').toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </Text>
                          <Text size="sm" c="dimmed">Invoice #{invoice.id}</Text>
                        </Stack>
                        <Group>
                          <Text fw={500}>${invoice.totalGross?.value?.toFixed(2)}</Text>
                          <Badge color="green">Paid</Badge>
                          <Button
                            variant="light"
                            size="sm"
                            leftSection={<IconDownload size={16} />}
                            onClick={() => {
                              const paymentIntentId = invoice.identifier?.find(
                                id => id.system === 'https://stripe.com/payment_intent'
                              )?.value;

                              if (paymentIntentId) {
                                medplum.executeBot(
                                  'stripe-invoice-download-bot-id',
                                  { paymentIntentId },
                                  'application/json'
                                ).then(response => {
                                  if (response.url) {
                                    window.open(response.url, '_blank');
                                  }
                                });
                              }
                            }}
                          >
                            Download
                          </Button>
                        </Group>
                      </Group>
                    </Paper>
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
                    leftSection={<IconHistory size={16} />}
                  >
                    View Payment History
                  </Button>
                  <Button 
                    variant="light" 
                    fullWidth 
                    leftSection={<IconSettings size={16} />}
                  >
                    Billing Settings
                  </Button>
                  <Button 
                    variant="light" 
                    fullWidth 
                    leftSection={<IconAlertCircle size={16} />}
                  >
                    Billing Support
                  </Button>
                </Stack>
              </Paper>

              <Paper withBorder p="xl">
                <Stack gap="md">
                  <Title order={4}>Processing Overview</Title>
                  <Stack gap="xs">
                    <Group position="apart">
                      <Text size="sm">This Month</Text>
                      <Text size="sm" fw={500}>$4,820.00</Text>
                    </Group>
                    <Group position="apart">
                      <Text size="sm">Pending Payouts</Text>
                      <Text size="sm" fw={500}>$950.00</Text>
                    </Group>
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