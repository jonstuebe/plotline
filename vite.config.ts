/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { cloudflare } from '@cloudflare/vite-plugin';
import type { Plugin } from 'vite';

import pkg from './package.json' with { type: 'json' };
import puzzles from './worker/puzzles.json' with { type: 'json' };
import movies from './worker/movies.json' with { type: 'json' };
import { MOVIE_LAUNCH_DATE, RUNWAY_WARNING_DAYS, parseDateKey, puzzleNumber } from './worker/puzzles.ts';

const THEME_COLOR = '#ffffff';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    // Vitest only needs React; the Worker runtime is for dev, preview and build.
    !process.env.VITEST && cloudflare(),
    puzzleRunway(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Plotline',
        short_name: 'Plotline',
        description: 'A daily book and movie game: guess today’s famous book and movie from summaries exactly five words long.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,webmanifest}', 'icons/*.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
  },
});

/** Warns on every build (and so every deploy) when either mode's Puzzles are about to run out. */
function puzzleRunway(): Plugin {
  return {
    name: 'plotline:puzzle-runway',
    apply: 'build',
    buildStart() {
      // Runs once per environment; report from the client build only.
      if (this.environment.name !== 'client') return;
      const today = parseDateKey(new Date().toISOString().slice(0, 10))!;
      const runway = [
        { name: 'Book Puzzles', file: 'worker/puzzles.json', count: puzzles.length, left: puzzles.length - puzzleNumber(today) },
        { name: 'Movie Puzzles', file: 'worker/movies.json', count: movies.length, left: movies.length - puzzleNumber(today, MOVIE_LAUNCH_DATE) },
      ];
      for (const { name, file, count, left } of runway) {
        if (left < RUNWAY_WARNING_DAYS) {
          this.warn(`Only ${Math.max(0, left)} ${name} left after today (${count} in ${file}). Add more before players see "Back tomorrow".`);
        }
      }
    },
  };
}
