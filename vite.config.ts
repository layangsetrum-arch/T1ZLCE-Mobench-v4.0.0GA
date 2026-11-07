import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {sessionSyncPlugin} from './vite-session-sync.ts';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode ?? 'development', process.cwd(), '');
  const disableHmr =
    process.env.DISABLE_HMR === 'true' ||
    process.env.DISABLE_HMR === '1' ||
    env.DISABLE_HMR === 'true' ||
    env.DISABLE_HMR === '1';

  if (disableHmr) {
    process.env.DISABLE_HMR = 'true';
  }

  return {
    plugins: [react(), tailwindcss(), sessionSyncPlugin()],
    resolve: {
      alias: {
        '@': path.resolve('src'),
      },
    },
    server: {
      host: process.env.HOST || '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: !disableHmr,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: disableHmr ? null : {},
    },
  };
});
