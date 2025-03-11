/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_MODE: 'TEST' | 'PROD'
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
