export const STRIPE_CONFIG = {
  // Test mode products
  TEST: {
    PREMIUM: {
      productId: 'prod_RtHsl0O7oQMFw5',
      priceId: 'price_1QzVIzIfLgrjtRiqyWxWfbzG',
      amount: 690, // in cents ($6.90)
      currency: 'usd',
      interval: 'month',
      features: [
        'Premium features',
        'Full access',
        'Priority support'
      ]
    }
  },
  
  // Production mode products (to be filled in later)
  PROD: {
    PREMIUM: {
      productId: '', // Will fill this in after creating live product
      priceId: '',  // Will fill this in after creating live product
      amount: 690,
      currency: 'usd',
      interval: 'month',
      features: [
        'Premium features',
        'Full access',
        'Priority support'
      ]
    }
  }
};
