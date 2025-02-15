import { Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Stripe, StripeElements } from '@stripe/stripe-js';

interface StripeCardElementProps {
  stripe: Stripe | null;
  elements: StripeElements | null;
  onChange?: (event: { complete: boolean; error?: { message: string } }) => void;
}

export function StripeCardElement({ stripe, elements, onChange }: StripeCardElementProps): JSX.Element {
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!stripe || !elements) return;

    console.log('🔄 Initializing card element...');
    const card = elements.create('card', {
      style: {
        base: {
          color: '#32325d',
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          fontSmoothing: 'antialiased',
          fontSize: '16px',
          '::placeholder': {
            color: '#aab7c4'
          }
        },
        invalid: {
          color: '#fa755a',
          iconColor: '#fa755a'
        }
      }
    });

    console.log('💳 Mounting card element...');
    card.mount('#card-element');

    card.on('change', (event) => {
      console.log('🔄 Card input changed:', {
        empty: event.empty,
        complete: event.complete,
        error: event.error?.message
      });
      
      setError(event.error?.message);
      onChange?.(event);
    });

    return () => {
      console.log('🧹 Cleaning up card element...');
      card.unmount();
    };
  }, [stripe, elements, onChange]);

  return (
    <>
      <div id="card-element" />
      {error && <Text color="red" size="sm">{error}</Text>}
    </>
  );
}
