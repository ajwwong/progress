import { Alert, Button, Stack } from '@mantine/core';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState, useEffect } from 'react';

interface CheckoutFormProps {
  clientSecret: string;
  onReady: () => void;
  onPaymentSuccess: () => void;
}

export function CheckoutForm({ clientSecret, onReady, onPaymentSuccess }: CheckoutFormProps): JSX.Element {
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

  // Check if the payment intent is already processed
  useEffect(() => {
    const checkPaymentIntent = async () => {
      if (!stripe || !clientSecret) return;
      
      try {
        const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
        console.log('💳 Retrieved payment intent status:', paymentIntent?.status);
        
        // If payment is already succeeded or processed, notify parent component
        if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
          console.log('✅ Payment already processed');
          onPaymentSuccess();
        }
      } catch (err) {
        console.error('❌ Error checking payment intent:', err);
      }
    };
    
    checkPaymentIntent();
  }, [stripe, clientSecret, onPaymentSuccess]);

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
      // Use confirmPayment without redirect
      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (paymentError) {
        console.error('❌ Payment error:', paymentError);
        
        // Special handling for payment_intent_unexpected_state error
        if (paymentError.type === 'invalid_request_error' && 
            paymentError.code === 'payment_intent_unexpected_state') {
          console.log('🔄 Payment may have been processed already, checking status...');
          
          try {
            const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
            if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
              console.log('✅ Payment confirmed as processed');
              onPaymentSuccess();
              return;
            }
          } catch (checkErr) {
            console.error('❌ Error checking payment intent status:', checkErr);
          }
        }
        
        throw paymentError;
      }

      // If we get here, payment was successful
      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        console.log('✅ Payment successful:', paymentIntent.status);
        onPaymentSuccess();
      }
    } catch (err) {
      console.error('❌ Payment submission failed:', err);
      
      // Format error message for display
      let errorMessage = 'An unexpected error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        // @ts-ignore - Handle Stripe error object
        errorMessage = err.message || JSON.stringify(err);
      }
      
      setError(errorMessage);
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
