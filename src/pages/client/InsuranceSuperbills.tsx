import { Title, Paper, Stack, Group, Text, Badge, Button } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Patient, Invoice, Task } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';
import { IconDownload, IconSend, IconRefresh } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';

export function InsuranceSuperbills() {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Patient;
  const [superbills, setSuperbills] = useState<Invoice[]>([]);
  const [claimTasks, setClaimTasks] = useState<Record<string, Task>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      setLoading(false);
    });
  }, [medplum, profile.id]);

  const downloadSuperbill = async (superbill: Invoice) => {
    try {
      const response = await medplum.executeBot(
        'generate-superbill-bot-id',
        superbill,
        'application/json'
      );

      if (response.url) {
        window.open(response.url, '_blank');
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to download superbill',
        color: 'red'
      });
    }
  };

  const submitToClearinghouse = async (superbill: Invoice) => {
    try {
      const response = await medplum.executeBot(
        'submit-insurance-claim-bot-id',
        superbill,
        'application/json'
      );

      if (response.success) {
        showNotification({
          title: 'Success',
          message: 'Claim submitted successfully',
          color: 'green'
        });

        const tasks = await medplum.searchResources('Task', {
          code: 'claim',
          focus: `Invoice/${superbill.id}`
        });
        if (tasks[0]) {
          setClaimTasks(prev => ({
            ...prev,
            [superbill.id as string]: tasks[0]
          }));
        }
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to submit claim',
        color: 'red'
      });
    }
  };

  const checkClaimStatus = async (task: Task) => {
    try {
      const response = await medplum.executeBot(
        'check-claim-status-bot-id',
        task,
        'application/json'
      );

      if (response.success) {
        setClaimTasks(prev => ({
          ...prev,
          [task.focus?.reference?.split('/')[1] as string]: {
            ...task,
            businessStatus: {
              coding: [{
                code: response.status,
                display: response.details
              }]
            }
          }
        }));

        showNotification({
          title: 'Status Updated',
          message: response.details,
          color: 'blue'
        });
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to check claim status',
        color: 'red'
      });
    }
  };

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <Stack spacing="lg">
      <Title order={2}>Insurance Superbills</Title>

      {superbills.map((superbill) => {
        const task = claimTasks[superbill.id as string];
        const claimStatus = task?.businessStatus?.coding?.[0];

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
                
                {task && (
                  <Badge 
                    color={
                      claimStatus?.code === 'approved' ? 'green' :
                      claimStatus?.code === 'denied' ? 'red' :
                      claimStatus?.code === 'pending' ? 'yellow' :
                      'blue'
                    }
                  >
                    {claimStatus?.display || 'Unknown'}
                  </Badge>
                )}

                <Group spacing={8}>
                  <Button
                    variant="light"
                    size="sm"
                    leftSection={<IconDownload size={16} />}
                    onClick={() => downloadSuperbill(superbill)}
                  >
                    Download
                  </Button>

                  {!task ? (
                    <Button
                      variant="light"
                      size="sm"
                      leftSection={<IconSend size={16} />}
                      onClick={() => submitToClearinghouse(superbill)}
                    >
                      Submit to Insurance
                    </Button>
                  ) : (
                    <Button
                      variant="subtle"
                      size="sm"
                      leftSection={<IconRefresh size={16} />}
                      onClick={() => checkClaimStatus(task)}
                    >
                      Check Status
                    </Button>
                  )}
                </Group>
              </Group>
            </Group>

            {task?.output?.[0]?.valueString && (
              <Text size="sm" mt="md" c="dimmed">
                {task.output[0].valueString}
              </Text>
            )}
          </Paper>
        );
      })}

      {superbills.length === 0 && (
        <Text c="dimmed" ta="center">No superbills found</Text>
      )}
    </Stack>
  );
}