import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/jsts/')) return 'topology';
          if (id.includes('/node_modules/polygon-clipping/'))
            return 'polygon-ops';
          if (
            /\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run\/router)\//.test(
              id,
            )
          )
            return 'react-vendor';
        },
      },
    },
  },
  plugins: [react()],
});
