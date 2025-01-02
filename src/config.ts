// Environment variables
export const MEDPLUM_BASE_URL = process.env.MEDPLUM_BASE_URL || 'http://localhost:8103';
export const MEDPLUM_PROJECT_ID = process.env.NEXT_PUBLIC_MEDPLUM_PROJECT_ID as string;
export const MEDPLUM_CLIENT_ID = process.env.MEDPLUM_CLIENT_ID;
export const MEDPLUM_CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET;

// Add reCAPTCHA configuration
export const MEDPLUM_RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LdyXaoqAAAAAP2G7TLmZGo6NTzzGhE7eqN6UPqV';

export interface Config {
  recaptchaSiteKey: string;
}

const config: Config = {
  recaptchaSiteKey: MEDPLUM_RECAPTCHA_SITE_KEY,
};

export function getConfig(): Config {
  return config;
} 
