import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

const basePath = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  plugins: [react()],
  base: basePath,
  // Provide an inline tsconfig so esbuild never tries to resolve the root
  // tsconfig.json (which extends @tsconfig/react-native, not installed here).
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        jsx: 'react-jsx',
        jsxImportSource: 'react',
      },
    },
  },
  server: {
    fs: {
      // Allow reading shared docs/source data from the repository root.
      allow: ['..'],
    },
  },
});
