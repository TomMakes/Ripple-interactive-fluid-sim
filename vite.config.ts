import { defineConfig } from 'vite';

// base must match the GitHub Pages repo path: https://<user>.github.io/Ripple-interactive-fluid-sim/
export default defineConfig({
  base: '/Ripple-interactive-fluid-sim/',
  // Phase 4 (§8) needs a phone on the same network to hit the dev server.
  server: {
    host: true,
  },
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
});
