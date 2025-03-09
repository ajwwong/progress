import { Card, Group, Stack, Text, Progress, Badge } from '@mantine/core';
import { Organization } from '@medplum/fhirtypes';
import { SubscriptionStatus } from './types';

interface SessionUsageCardProps {
  organization: Organization;
}

export function SessionUsageCard({ organization }: SessionUsageCardProps): JSX.Element {
  // Get session usage data from organization extensions
  const sessionsUsed = organization.extension?.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-sessions-used'
  )?.valueInteger || 0;

  const sessionsLimit = organization.extension?.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-sessions-allowed'
  )?.valueInteger || 10; // Default to 10 for free tier

  const lastResetDate = organization.extension?.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/session-last-reset'
  )?.valueDateTime;

  const subscriptionStatus = organization.extension?.find(
    e => e.url === 'http://example.com/fhir/StructureDefinition/subscription-status'
  )?.valueString as SubscriptionStatus || 'free';

  const usagePercentage = (sessionsUsed / sessionsLimit) * 100;
  const sessionsRemaining = sessionsLimit - sessionsUsed;
  const isOverLimit = sessionsUsed >= sessionsLimit;

  return (
    <Card withBorder>
      <Stack>
        <Group justify="space-between">
          <Text fw={500} size="lg">Session Usage</Text>
          <Badge color={subscriptionStatus === 'active' ? 'green' : 'blue'}>
            {subscriptionStatus === 'active' ? 'Active Plan' : 'Free Plan'}
          </Badge>
        </Group>

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm">Sessions Used</Text>
            <Text size="sm" fw={500}>
              {sessionsUsed} / {sessionsLimit}
            </Text>
          </Group>

          <Progress 
            value={usagePercentage} 
            color={isOverLimit ? (subscriptionStatus === 'active' ? 'yellow' : 'red') : 'blue'}
            size="md"
          />

          <Text size="sm" c={isOverLimit ? (subscriptionStatus === 'active' ? 'yellow' : 'red') : 'dimmed'}>
            {isOverLimit ? (
              subscriptionStatus === 'active' ? (
                `Over plan limit - additional sessions will be billed at standard rate`
              ) : (
                `No sessions remaining this month`
              )
            ) : (
              `${sessionsRemaining} sessions remaining`
            )}
          </Text>

          {lastResetDate && (
            <Group gap="xs" justify="space-between">
              <Text size="xs" c="dimmed">
                Last reset: {new Date(lastResetDate).toLocaleDateString()}
              </Text>
              <Text size="xs" c="dimmed">
                Next reset: {new Date(new Date(lastResetDate).setMonth(new Date(lastResetDate).getMonth() + 1)).toLocaleDateString()}
              </Text>
            </Group>
          )}
        </Stack>
      </Stack>
    </Card>
  );
} 