import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@afh/shared': path.resolve(rootDir, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
  },
});
