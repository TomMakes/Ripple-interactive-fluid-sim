import { defineConfig } from 'vite';

// base must match the GitHub Pages repo path: https://<user>.github.io/Ripple-interactive-fluid-sim/
export default defineConfig({
  base: '/Ripple-interactive-fluid-sim/',
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
});
