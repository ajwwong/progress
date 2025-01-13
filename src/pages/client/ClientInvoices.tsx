import { Title, Paper, Stack, Group, Text, Badge, Button } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Patient, Invoice } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';
import { IconDownload, IconReceipt } from '@tabler/icons-react';

export function ClientInvoices() {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Patient;
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    medplum.searchResources('Invoice', {
      subject: `Patient/${profile.id}`,
      _sort: '-date'
    }).then(setInvoices);
  }, [medplum, profile.id]);

  const downloadInvoice = async (invoice: Invoice) => {
    try {
      // Get Stripe payment intent ID
      const paymentIntentId = invoice.identifier?.find(
        id => id.system === 'https://stripe.com/payment_intent'
      )?.value;

      if (!paymentIntentId) {
        throw new Error('Payment intent ID not found');
      }

      // Call bot to generate PDF invoice
      const response = await medplum.executeBot(
        'stripe-invoice-download-bot-id', // Replace with your bot ID
        { paymentIntentId },
        'application/json'
      );

      if (response.url) {
        window.open(response.url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
    }
  };

  return (
    <Stack spacing="lg">
      <Title order={2}>Invoices & Receipts</Title>

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
              <Text size="sm" c="dimmed">
                Invoice #{invoice.id}
              </Text>
            </Stack>

            <Group>
              <Text fw={500}>
                ${invoice.totalGross?.value?.toFixed(2)}
              </Text>
              <Badge color="green">Paid</Badge>
              <Button
                variant="light"
                size="sm"
                leftIcon={<IconDownload size={16} />}
                onClick={() => downloadInvoice(invoice)}
              >
                Download
              </Button>
            </Group>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}