import { Table, Text, Badge, Button, Group, ThemeIcon, Tooltip, ScrollArea, Stack } from '@mantine/core';
import { IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';
import { STRIPE_CONFIG } from '../../../../config/stripe-config';
import { SubscriptionStatus } from './types';

interface PlanComparisonTableProps {
  currentPlanId?: string;
  currentStatus?: SubscriptionStatus;
  onSelectPlan: (sessions: string) => void;
  loading: boolean;
}

// Helper function to calculate cost per session
const calculateCostPerSession = (price: number, sessions: number): number => {
  return parseFloat((price / sessions).toFixed(2));
};

// Helper function to get recommended use case based on session count
const getRecommendedUseCase = (sessions: number): string => {
  if (sessions <= 30) {
    return 'Light usage (1-7 sessions per week)';
  } else if (sessions <= 60) {
    return 'Medium usage (8-15 sessions per week)';
  } else if (sessions <= 120) {
    return 'Heavy usage (15-30 sessions per week)';
  } else {
    return 'Intensive usage (30+ sessions per week)';
  }
};

// Helper function to get feature availability
const getFeatureAvailability = (feature: string, sessions: number): boolean => {
  switch (feature) {
    case 'Priority Support':
      return sessions >= 60;
    case 'Custom Templates':
      return sessions >= 90;
    case 'Advanced Analytics':
      return sessions >= 120;
    default:
      return true;
  }
};

export function PlanComparisonTable({ 
  currentPlanId, 
  currentStatus, 
  onSelectPlan,
  loading
}: PlanComparisonTableProps): JSX.Element {
  // Get plans from config
  const plans = Object.values(STRIPE_CONFIG.TEST.STANDARD.plans)
    // Sort by number of sessions
    .sort((a, b) => a.sessions - b.sessions)
    // Take only the first 4 plans for the comparison table
    .slice(0, 4);

  const features = [
    {
      name: 'Automated Progress Notes',
      description: 'AI-powered progress note generation',
      included: true
    },
    {
      name: 'AI-powered Magic Edits',
      description: 'Smart text editing and formatting suggestions',
      included: true
    },
    {
      name: 'Calendar Scheduler',
      description: 'Integrated appointment management',
      included: true
    },
    {
      name: 'Priority Support',
      description: '24/7 priority customer support',
      conditional: true
    },
    {
      name: 'Custom Templates',
      description: 'Create and save custom note templates',
      conditional: true
    },
    {
      name: 'Advanced Analytics',
      description: 'Detailed usage and performance metrics',
      conditional: true
    }
  ];

  return (
    <Stack gap="xs">
      <Group justify="space-between" mb="xs">
        <Text size="lg" fw={500}>Compare Plans</Text>
        <Tooltip
          label="Compare our plans to find the best fit for your needs"
          position="left"
          withArrow
        >
          <IconInfoCircle size={20} style={{ cursor: 'help' }} />
        </Tooltip>
      </Group>
      <ScrollArea>
        <Table striped highlightOnHover withTableBorder withColumnBorders style={{ minWidth: 600 }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ whiteSpace: 'nowrap' }}>Plan Features</Table.Th>
              {plans.map((plan) => (
                <Table.Th key={plan.priceId} ta="center" style={{ whiteSpace: 'nowrap' }}>
                  <Stack gap={4} align="center">
                    <Text fw={600}>{plan.sessions} Sessions</Text>
                    {currentPlanId === plan.priceId && currentStatus === 'active' && (
                      <Badge color="green" variant="light" size="xs">
                        Current
                      </Badge>
                    )}
                  </Stack>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {/* Price row */}
            <Table.Tr>
              <Table.Td fw={500}>
                Monthly Price
                <Tooltip
                  label="Billed monthly, automatically renews unless canceled"
                  position="right"
                  withArrow
                  multiline
                  w={220}
                >
                  <IconInfoCircle size={14} style={{ marginLeft: 5, verticalAlign: 'middle', cursor: 'help' }} />
                </Tooltip>
              </Table.Td>
              {plans.map((plan) => (
                <Table.Td key={plan.priceId} ta="center">
                  <Text fw={600} size="lg" style={{ color: '#228be6' }}>
                    ${(plan.amount / 100).toFixed(2)}
                  </Text>
                </Table.Td>
              ))}
            </Table.Tr>

            {/* Sessions row */}
            <Table.Tr>
              <Table.Td fw={500}>
                Monthly Sessions
                <Tooltip
                  label="Maximum number of sessions you can use per month"
                  position="right"
                  withArrow
                  multiline
                  w={220}
                >
                  <IconInfoCircle size={14} style={{ marginLeft: 5, verticalAlign: 'middle', cursor: 'help' }} />
                </Tooltip>
              </Table.Td>
              {plans.map((plan) => (
                <Table.Td key={plan.priceId} ta="center">
                  <Text fw={500}>{plan.sessions}</Text>
                </Table.Td>
              ))}
            </Table.Tr>

            {/* Cost per session row */}
            <Table.Tr>
              <Table.Td fw={500}>
                Cost per Session
                <Tooltip
                  label="The average cost per session if you use all available sessions"
                  position="right"
                  withArrow
                  multiline
                  w={220}
                >
                  <IconInfoCircle size={14} style={{ marginLeft: 5, verticalAlign: 'middle', cursor: 'help' }} />
                </Tooltip>
              </Table.Td>
              {plans.map((plan) => (
                <Table.Td key={plan.priceId} ta="center">
                  <Text c="dimmed">${calculateCostPerSession(plan.amount / 100, plan.sessions)}</Text>
                </Table.Td>
              ))}
            </Table.Tr>

            {/* Recommended use case row */}
            <Table.Tr>
              <Table.Td fw={500}>
                Recommended For
                <Tooltip
                  label="Our recommendation based on typical usage patterns"
                  position="right"
                  withArrow
                  multiline
                  w={220}
                >
                  <IconInfoCircle size={14} style={{ marginLeft: 5, verticalAlign: 'middle', cursor: 'help' }} />
                </Tooltip>
              </Table.Td>
              {plans.map((plan) => (
                <Table.Td key={plan.priceId} ta="center">
                  <Text size="sm" c="dimmed">{getRecommendedUseCase(plan.sessions)}</Text>
                </Table.Td>
              ))}
            </Table.Tr>

            <Table.Tr>
              <Table.Td colSpan={plans.length + 1} style={{ backgroundColor: '#f8f9fa' }}>
                <Text fw={600} size="sm">Features</Text>
              </Table.Td>
            </Table.Tr>

            {/* Features rows */}
            {features.map((feature) => (
              <Table.Tr key={feature.name}>
                <Table.Td fw={500}>
                  {feature.name}
                  <Tooltip
                    label={feature.description}
                    position="right"
                    withArrow
                    multiline
                    w={220}
                  >
                    <IconInfoCircle size={14} style={{ marginLeft: 5, verticalAlign: 'middle', cursor: 'help' }} />
                  </Tooltip>
                </Table.Td>
                {plans.map((plan) => (
                  <Table.Td key={plan.priceId} ta="center">
                    {feature.included || (feature.conditional && getFeatureAvailability(feature.name, plan.sessions)) ? (
                      <ThemeIcon color="green" variant="light" size="sm" radius="xl">
                        <IconCheck size={14} />
                      </ThemeIcon>
                    ) : (
                      <ThemeIcon color="gray" variant="light" size="sm" radius="xl">
                        <IconX size={14} />
                      </ThemeIcon>
                    )}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}

            {/* Action row */}
            <Table.Tr>
              <Table.Td></Table.Td>
              {plans.map((plan) => (
                <Table.Td key={plan.priceId} ta="center" style={{ padding: '16px 8px' }}>
                  <Button
                    variant={currentPlanId === plan.priceId && currentStatus === 'active' ? 'light' : 'filled'}
                    color={currentPlanId === plan.priceId && currentStatus === 'active' ? 'gray' : 'blue'}
                    onClick={() => {
                      if (!loading && !(currentPlanId === plan.priceId && currentStatus === 'active')) {
                        onSelectPlan(String(plan.sessions));
                      }
                    }}
                    disabled={(currentPlanId === plan.priceId && currentStatus === 'active') || loading}
                    size="sm"
                    fullWidth
                  >
                    {currentPlanId === plan.priceId && currentStatus === 'active' 
                      ? 'Current Plan' 
                      : currentStatus === 'active' 
                        ? 'Upgrade' 
                        : 'Select'}
                  </Button>
                </Table.Td>
              ))}
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
} 