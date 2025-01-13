import { Title, Paper, Stack, Text, Group, Button, Badge } from '@mantine/core';
import { Document, useMedplum } from '@medplum/react';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CarePlan } from '@medplum/fhirtypes';
import { IconPlus } from '@tabler/icons-react';

export function TreatmentPlan(): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      medplum.searchResources('CarePlan', {
        subject: `Patient/${id}`,
        _sort: '-date',
      })
        .then(setPlans)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [medplum, id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'completed': return 'blue';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Document>
      <Stack spacing="xl">
        <Group position="apart">
          <Title order={2}>Treatment Plans</Title>
          <Button 
            leftIcon={<IconPlus size={16} />}
            onClick={() => {/* Add treatment plan creation logic */}}
          >
            New Treatment Plan
          </Button>
        </Group>

        {plans.map((plan) => (
          <Paper key={plan.id} p="md" withBorder>
            <Group position="apart" mb="md">
              <Stack spacing={0}>
                <Text fw={500}>{plan.title}</Text>
                <Text size="sm" c="dimmed">
                  Created: {new Date(plan.created || '').toLocaleDateString()}
                </Text>
              </Stack>
              <Badge color={getStatusColor(plan.status || '')}>
                {plan.status}
              </Badge>
            </Group>

            {plan.goal?.map((goal, index) => (
              <Paper key={index} withBorder p="sm" mt="md">
                <Text fw={500}>Goal {index + 1}</Text>
                <Text size="sm">{goal.description?.text}</Text>
              </Paper>
            ))}

            {plan.activity?.map((activity, index) => (
              <Paper key={index} withBorder p="sm" mt="md">
                <Text fw={500}>Intervention {index + 1}</Text>
                <Text size="sm">{activity.detail?.description}</Text>
              </Paper>
            ))}
          </Paper>
        ))}
      </Stack>
    </Document>
  );
}