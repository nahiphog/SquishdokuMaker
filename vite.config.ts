import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/SquishdokuMaker/',
  build: {
    rollupOptions: {
      input: {
        generate: resolve(__dirname, 'index.html'),
        customBuild: resolve(__dirname, 'custom-build/index.html'),
        verify: resolve(__dirname, 'verify/index.html'),
        simulation: resolve(__dirname, 'simulation/index.html'),
        simulationPattern: resolve(__dirname, 'simulation-pattern/index.html'),
        simlationSteps: resolve(__dirname, 'simlation-steps/index.html'),
        simulationSteps: resolve(__dirname, 'simulation-steps/index.html'),
        simulationSubset: resolve(__dirname, 'simulation-subset/index.html'),
        techniques: resolve(__dirname, 'techniques/index.html'),
      },
    },
  },
});
