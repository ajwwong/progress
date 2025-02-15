import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dns from 'dns';
import path from 'path';
import fs from 'fs';
import path from 'path';

dns.setDefaultResultOrder('verbatim');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  host: 'localhost',
  port: 3000,
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '.cert/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '.cert/cert.pem')),
    },
    port: 5173
  }
});
