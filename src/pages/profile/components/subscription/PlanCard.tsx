import { Card, Text, List, ThemeIcon, Button, Stack, Group, Badge } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanProps {
  name: string;
  price: number;
  interval: string;
  features: PlanFeature[];
  isCurrentPlan?: boolean;
  onSelect: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function PlanCard({ name, price, interval, features, isCurrentPlan, onSelect, loading, disabled }: PlanProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack>
        <Group justify="space-between" align="center">
          <Text size="xl" fw={700}>{name}</Text>
          {isCurrentPlan && <Badge color="green">Current Plan</Badge>}
        </Group>
        
        <Group>
          <Text size="xl" fw={700}>${price}</Text>
          <Text size="sm" c="dimmed">/{interval}</Text>
        </Group>

        <List
          spacing="sm"
          size="sm"
          center
          icon={
            <ThemeIcon color="teal" size={24} radius="xl">
              <IconCheck size="1rem" />
            </ThemeIcon>
          }
        >
          {features.map((feature, index) => (
            <List.Item key={index} style={{ opacity: feature.included ? 1 : 0.5 }}>
              {feature.text}
            </List.Item>
          ))}
        </List>

        <Button 
          variant={isCurrentPlan ? "light" : "filled"}
          onClick={onSelect}
          loading={loading}
          disabled={isCurrentPlan || disabled}
        >
          {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
        </Button>
      </Stack>
    </Card>
  );
}
