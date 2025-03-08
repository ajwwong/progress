import { Card, Stack, Text, Badge, Group, Button } from '@mantine/core';
import { Elements } from '@stripe/react-stripe-js';
import { CheckoutForm } from './CheckoutForm';
import { SubscriptionInfo } from './types';

interface SubscriptionCardProps {
  subscriptionInfo?: SubscriptionInfo;
  clientSecret: string;
  loading: boolean;
  disabled: boolean;
  onSubscribe: () => void;
  onElementsReady: () => void;
  stripePromise: Promise<any>;
  options: any;
}

export function SubscriptionCard({
  subscriptionInfo,
  clientSecret,
  loading,
  disabled,
  onSubscribe,
  onElementsReady,
  stripePromise,
  options
}: SubscriptionCardProps): JSX.Element {
  if (subscriptionInfo) {
    return (
      <Card>
        <Stack>
          <Text fw={500} size="lg">Current Subscription</Text>
          <Group>
            <Text>Status:</Text>
            <Badge color={subscriptionInfo.status === 'active' ? 'green' : 'red'}>
              {subscriptionInfo.status}
            </Badge>
          </Group>
          {subscriptionInfo.planId && (
            <Text>Plan: {subscriptionInfo.planId}</Text>
          )}
          {subscriptionInfo.periodEnd && (
            <Text>
              Renews: {new Date(subscriptionInfo.periodEnd).toLocaleDateString()}
            </Text>
          )}
        </Stack>
      </Card>
    );
  }

  return (
    <Card>
      <Stack align="center">
        <Text>No active subscription</Text>
        {!clientSecret ? (
          <Button 
            onClick={onSubscribe} 
            loading={loading} 
            disabled={disabled}
          >
            {loading ? 'Processing...' : 'Subscribe Now'}
          </Button>
        ) : (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm 
              clientSecret={clientSecret}
              onReady={onElementsReady} 
            />
          </Elements>
        )}
      </Stack>
    </Card>
  );
}
