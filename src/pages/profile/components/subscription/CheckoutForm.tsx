import { Alert, Button, Stack } from '@mantine/core';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState, useEffect } from 'react';

interface CheckoutFormProps {
  clientSecret: string;
  onReady: () => void;
}

export function CheckoutForm({ clientSecret, onReady }: CheckoutFormProps): JSX.Element {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const ready = !!(stripe && elements && paymentElementReady);
    console.log('🔄 Payment form readiness check:', {
      stripeLoaded: !!stripe,
      elementsLoaded: !!elements,
      paymentElementReady,
      allReady: ready
    });

    if (ready) {
      console.log('✅ All payment components ready');
      setShowForm(true);
      onReady();
    }
  }, [stripe, elements, paymentElementReady, onReady]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log('🚀 Payment submission started');

    if (!stripe || !elements || !paymentElementReady) {
      console.error('❌ Payment system not fully initialized:', {
        stripeLoaded: !!stripe,
        elementsLoaded: !!elements,
        paymentElementReady
      });
      setError('Payment system is not fully initialized');
      return;
    }

    try {
      setProcessing(true);
      setError(undefined);

      console.log('🔄 Validating payment form...');
      const { error: validationError } = await elements.submit();
      if (validationError) {
        console.error('❌ Validation error:', validationError);
        throw validationError;
      }

      console.log('💳 Confirming payment...');
      const { error: paymentError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/settings?tab=subscription&redirect_status=succeeded`,
        },
      });

      if (paymentError) {
        console.error('❌ Payment error:', paymentError);
        throw paymentError;
      }
    } catch (err) {
      console.error('❌ Payment submission failed:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ opacity: showForm ? 1 : 0 }}>
      <Stack>
        <PaymentElement
          id="payment-element"
          options={{
            layout: 'tabs'
          }}
          onReady={() => {
            console.log('💳 PaymentElement ready');
            setPaymentElementReady(true);
          }}
          onChange={() => {
            setError(undefined);
          }}
        />
        <Button 
          type="submit" 
          loading={processing}
          disabled={!showForm}
        >
          {processing ? 'Processing...' : 'Complete Payment'}
        </Button>
        {error && (
          <Alert color="red" title="Payment Error">
            {error}
          </Alert>
        )}
      </Stack>
    </form>
  );
}
