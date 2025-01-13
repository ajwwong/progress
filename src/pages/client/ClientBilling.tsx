import { Title, Paper, Stack, Group, Text, Badge, Button, Tabs, Modal, TextInput } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Patient, Invoice, Task } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';
import { IconDownload, IconSend, IconRefresh, IconCreditCard } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeElements } from '@stripe/stripe-js';

const stripePromise = loadStripe('your_publishable_key');

export function ClientBilling() {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Patient;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [superbills, setSuperbills] = useState<Invoice[]>([]);
  const [claimTasks, setClaimTasks] = useState<Record<string, Task>>({});
  const [paymentMethod, setPaymentMethod] = useState<any>();

  // New state for payment modal
  const [modalOpened, setModalOpened] = useState(false);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [name, setName] = useState('');

  // Combine all the useEffect calls from ClientInvoices and InsuranceSuperbills
  useEffect(() => {
    // Load payment method
    medplum.searchResources('PaymentMethod', {
      subject: `Patient/${profile.id}`,
      status: 'active'
    }).then(methods => setPaymentMethod(methods[0]));

    // Load regular invoices
    medplum.searchResources('Invoice', {
      subject: `Patient/${profile.id}`,
      _sort: '-date'
    }).then(setInvoices);

    // Load superbills and claim tasks
    Promise.all([
      medplum.searchResources('Invoice', {
        subject: `Patient/${profile.id}`,
        type: 'superbill',
        _sort: '-date'
      }),
      medplum.searchResources('Task', {
        code: 'claim',
        focus: 'Invoice'
      })
    ]).then(([bills, tasks]) => {
      setSuperbills(bills);
      const taskMap: Record<string, Task> = {};
      tasks.forEach(task => {
        const invoiceId = task.focus?.reference?.split('/')[1];
        if (invoiceId) {
          taskMap[invoiceId] = task;
        }
      });
      setClaimTasks(taskMap);
    });
  }, [medplum, profile.id]);

  // New useEffect for Stripe Elements
  useEffect(() => {
    if (modalOpened) {
      const initStripe = async () => {
        const stripe = await stripePromise;
        if (!stripe) {
          setError('Failed to load Stripe');
          return;
        }

        const elements = stripe.elements();
        const card = elements.create('card');
        card.mount('#card-element');
        card.on('change', (event) => {
          setError(event.error ? event.error.message : undefined);
        });

        setStripe(stripe);
        setElements(elements);
      };

      initStripe();
    }

    return () => {
      if (elements) {
        const card = elements.getElement('card');
        if (card) {
          card.unmount();
        }
      }
    };
  }, [modalOpened]);

  const handleSubmit = async () => {
    // Reference to PaymentMethodModal handleSubmit logic lines 59-119
  };

  return (
    <Stack spacing="lg">
      <Title order={2}>Billing & Payments</Title>

      {/* Payment Method Section */}
      <Paper p="md" withBorder>
        <Stack spacing="md">
          <Group position="apart">
            <Title order={3}>Payment Method</Title>
            <Button
              variant="light"
              leftIcon={<IconCreditCard size={16} />}
              onClick={() => setModalOpened(true)}
            >
              {paymentMethod ? 'Update Payment Method' : 'Add Payment Method'}
            </Button>
          </Group>

          {paymentMethod ? (
            <Group>
              <IconCreditCard size={20} />
              <Text>Card ending in {paymentMethod.identifier?.[0]?.value?.slice(-4)}</Text>
              <Badge color="green">Active</Badge>
            </Group>
          ) : (
            <Text c="dimmed">No payment method on file</Text>
          )}
        </Stack>
      </Paper>

      {/* Payment Method Modal */}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Add Payment Method">
        <Stack spacing="md">
          <TextInput
            label="Cardholder Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <Text size="sm" fw={500} mb={8}>Card Information</Text>
            <div 
              id="card-element" 
              style={{ 
                padding: '10px',
                border: '1px solid #ced4da',
                borderRadius: '4px'
              }}
            />
          </div>

          {error && (
            <Text color="red" size="sm">
              {error}
            </Text>
          )}

          <Text size="xs" c="dimmed">
            Your payment information is securely processed by Stripe.
          </Text>

          <Group position="right" mt="md">
            <Button variant="light" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              loading={loading}
              disabled={!name}
            >
              Save Payment Method
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Tabs for Invoices and Superbills */}
      <Tabs defaultValue="invoices">
        <Tabs.List>
          <Tabs.Tab value="invoices">Invoices & Receipts</Tabs.Tab>
          <Tabs.Tab value="superbills">Insurance Superbills</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="invoices" pt="md">
          <Stack spacing="md">
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
            {invoices.length === 0 && (
              <Text c="dimmed" ta="center" py="xl">
                No invoices found
              </Text>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="superbills" pt="md">
          <Stack spacing="md">
            {superbills.map((superbill) => {
              const claimTask = claimTasks[superbill.id as string];
              const isProcessing = claimTask?.status === 'in-progress';
              const isSubmitted = claimTask?.status === 'completed';

              return (
                <Paper key={superbill.id} p="md" withBorder>
                  <Group position="apart">
                    <Stack spacing={4}>
                      <Text fw={500}>
                        {new Date(superbill.date || '').toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Superbill #{superbill.id}
                      </Text>
                    </Stack>

                    <Group>
                      <Text fw={500}>
                        ${superbill.totalGross?.value?.toFixed(2)}
                      </Text>
                      {isSubmitted ? (
                        <Badge color="green">Submitted to Insurance</Badge>
                      ) : isProcessing ? (
                        <Badge color="yellow">Processing</Badge>
                      ) : (
                        <Button
                          variant="light"
                          size="sm"
                          leftIcon={<IconSend size={16} />}
                          onClick={() => {
                            medplum.createResource({
                              resourceType: 'Task',
                              status: 'in-progress',
                              code: {
                                coding: [{
                                  system: 'http://terminology.hl7.org/CodeSystem/task-code',
                                  code: 'claim',
                                  display: 'Submit Insurance Claim'
                                }]
                              },
                              focus: {
                                reference: `Invoice/${superbill.id}`
                              }
                            }).then(() => {
                              showNotification({
                                title: 'Success',
                                message: 'Superbill submitted to insurance',
                                color: 'green'
                              });
                            });
                          }}
                        >
                          Submit to Insurance
                        </Button>
                      )}
                      <Button
                        variant="light"
                        size="sm"
                        leftIcon={<IconDownload size={16} />}
                        onClick={() => {
                          // Download superbill PDF logic
                          medplum.executeBot(
                            'superbill-download-bot-id',
                            { superbillId: superbill.id },
                            'application/json'
                          ).then(response => {
                            if (response.url) {
                              window.open(response.url, '_blank');
                            }
                          });
                        }}
                      >
                        Download
                      </Button>
                    </Group>
                  </Group>
                </Paper>
              )
            })}
            {superbills.length === 0 && (
              <Text c="dimmed" ta="center" py="xl">
                No superbills found
              </Text>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}