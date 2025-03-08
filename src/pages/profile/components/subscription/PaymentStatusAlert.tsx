import { Alert } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

interface PaymentStatusAlertProps {
  status?: 'success' | 'failed';
  error?: string;
}

export function PaymentStatusAlert({ status, error }: PaymentStatusAlertProps): JSX.Element {
  if (error) {
    return (
      <Alert color="red" title="Error">
        {error}
      </Alert>
    );
  }

  if (status === 'success') {
    return (
      <Alert icon={<IconCheck size="1rem" />} color="green" title="Payment Successful">
        Your subscription has been activated successfully! Your organization details will update shortly.
      </Alert>
    );
  }

  if (status === 'failed') {
    return (
      <Alert color="red" title="Payment Failed">
        There was an issue processing your payment. Please try again.
      </Alert>
    );
  }

  return <></>;
}
