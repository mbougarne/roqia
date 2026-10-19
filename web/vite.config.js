import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

const basePath = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  plugins: [react()],
  base: basePath,
  server: {
    fs: {
      // Allow reading shared docs/source data from the repository root.
      allow: ['..'],
    },
  },
});
