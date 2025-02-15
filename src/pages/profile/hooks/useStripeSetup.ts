import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_51QbTYlIhrZKLmPhepqAOfCYqEnOgCMXRbyJAxn5BBqECnJE3kupGQspkOj9h2hOkY8VbqLP0N4xwEnI6ixwpEfPK00qe2kNrOw');

export function useStripeSetup() {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [cardElement, setCardElement] = useState<StripeCardElement | null>(null);
  const [error, setError] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initStripe = async () => {
      try {
        const stripeInstance = await stripePromise;
        if (!stripeInstance || !mounted) {
          throw new Error('Failed to load Stripe');
        }

        const elementsInstance = stripeInstance.elements();
        const card = elementsInstance.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
            },
          }
        });

        if (mounted) {
          setStripe(stripeInstance);
          setElements(elementsInstance);
          setCardElement(card);
          setIsReady(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize Stripe');
        }
      }
    };

    initStripe();

    return () => {
      mounted = false;
      if (cardElement) {
        cardElement.destroy();
      }
    };
  }, []);

  return { stripe, elements, cardElement, error, isReady };
}
