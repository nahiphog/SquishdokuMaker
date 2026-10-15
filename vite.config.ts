import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        generate: resolve(__dirname, 'index.html'),
        customBuild: resolve(__dirname, 'custom-build/index.html'),
        verify: resolve(__dirname, 'verify/index.html'),
        simulation: resolve(__dirname, 'simulation/index.html'),
        techniques: resolve(__dirname, 'techniques/index.html'),
      },
    },
  },
});
