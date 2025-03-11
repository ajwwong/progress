export const ENV = {
  IS_PRODUCTION: import.meta.env.PROD,
  STRIPE_MODE: import.meta.env.VITE_STRIPE_MODE || 'TEST', // 'TEST' or 'PROD'
  STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
};
