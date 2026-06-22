import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Plugin: convert injected <link rel="stylesheet"> to non-blocking preload pattern.
// Safe for SPAs because <div id="root"> has no visible content until JS renders anyway,
// so CSS will be fully loaded before React paints anything meaningful.
const nonBlockingCss = () => ({
  name: 'non-blocking-css',
  transformIndexHtml(html: string) {
    return html.replace(
      /<link rel="stylesheet" (crossorigin )?href="([^"]+\.css[^"]*)"\s*\/?>/g,
      (_match: string, crossorigin: string | undefined, href: string) => {
        const co = crossorigin ? ' crossorigin' : '';
        return (
          `<link rel="preload" href="${href}" as="style"${co} onload="this.onload=null;this.rel='stylesheet'">` +
          `<noscript><link rel="stylesheet" href="${href}"${co}></noscript>`
        );
      }
    );
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nonBlockingCss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'boltcall_icon.png',
        'boltcall_full_logo.png',
        'apple-touch-icon-180x180.png',
        'robots.txt',
      ],
      manifest: {
        name: 'Boltcall - AI Receptionist',
        short_name: 'Boltcall',
        description: 'AI receptionist for local businesses. Never miss a call or lead.',
        theme_color: '#2563EB',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/dashboard',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        globIgnores: ['**/*.lottie', '**/Loading_animation_blue.json', '**/retell-voices.json'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60,
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/realtime\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^\/.netlify\/functions\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'netlify-functions',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 5 * 60,
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api/,
          /^\/.netlify/,
          /^\/auth\/callback/,
          /^\/blog(?:\/.*)?$/,
          /^\/after-hours-lead-rescue\/?$/,
          /^\/automatic-reviews-agent\/?$/,
          /^\/reminders-agent\/?$/,
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // ponytail: skip entry crawling; local Vite/Netlify dev was dying before the app booted.
    noDiscovery: true,
  },
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            const normalizedId = id.replace(/\\/g, '/');
            // React core — always needed on every page; keep as stable named chunks
            // so browsers can cache them independently across deploys.
            if (normalizedId.includes('/node_modules/react/')) return 'react';
            if (normalizedId.includes('/node_modules/react-dom/')) return 'react-dom';
            if (normalizedId.includes('/node_modules/react-router')) return 'react-router';
            // i18n — initialised at startup on all routes
            if (normalizedId.includes('i18next')) return 'i18n';
            // Lucide icons — eagerly imported by Header; needs to be stable
            if (normalizedId.includes('lucide-react')) return 'icons';
            // IMPORTANT: Do NOT name @supabase, @lottiefiles, framer-motion, or
            // @radix-ui here. Vite adds ALL named manualChunks to <link
            // rel="modulepreload"> in index.html. Those libraries are only used
            // by lazy routes, so naming them forces the browser to parse them on
            // every page even for visitors who never reach a dashboard or animation.
            // Let Rollup auto-split them into unnamed lazy-only shared chunks.
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
