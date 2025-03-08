import { Card, Text, Group, Stack, Button, Badge, Modal } from '@mantine/core';
import { useState } from 'react';
import { SubscriptionInfo } from './types';

interface CurrentSubscriptionProps {
  subscriptionInfo: SubscriptionInfo;
  onCancel: () => Promise<void>;
}

export function CurrentSubscription({ subscriptionInfo, onCancel }: CurrentSubscriptionProps) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await onCancel();
      setCancelModalOpen(false);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Card withBorder>
        <Stack>
          <Group justify="apart">
            <Text size="xl" fw={700}>Current Subscription</Text>
            <Badge 
              color={subscriptionInfo.status === 'active' ? 'green' : 'yellow'}
              size="lg"
            >
              {subscriptionInfo.status}
            </Badge>
          </Group>

          <Group>
            <Text size="lg" fw={500}>${subscriptionInfo.price}</Text>
            <Text size="sm" c="dimmed">/{subscriptionInfo.interval}</Text>
          </Group>

          <Text>Next billing date: {new Date(subscriptionInfo.periodEnd).toLocaleDateString()}</Text>

          <Button 
            color="red" 
            variant="light"
            onClick={() => setCancelModalOpen(true)}
          >
            Cancel Subscription
          </Button>
        </Stack>
      </Card>

      <Modal
        opened={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Subscription"
      >
        <Stack>
          <Text>Are you sure you want to cancel your subscription?</Text>
          <Text size="sm" c="dimmed">
            Your subscription will remain active until the end of the current billing period.
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setCancelModalOpen(false)}>
              Keep Subscription
            </Button>
            <Button 
              color="red" 
              loading={cancelling}
              onClick={handleCancel}
            >
              Confirm Cancellation
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
