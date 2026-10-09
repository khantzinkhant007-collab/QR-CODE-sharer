import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { loadEnv, type Plugin } from 'vite'
import { resolveApiBaseUrl } from './src/lib/apiBaseUrl.ts'

function apiContentSecurityPolicy(): Plugin {
  let apiOrigin = ''
  return {
    name: 'scansend-api-content-security-policy',
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir, 'VITE_')
      const apiBaseUrl = resolveApiBaseUrl(env.VITE_API_BASE_URL, config.command === 'build')
      apiOrigin = apiBaseUrl ? new URL(apiBaseUrl).origin : ''
    },
    transformIndexHtml(html) {
      return html.replace('__SCANSEND_API_ORIGIN__', apiOrigin)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    apiContentSecurityPolicy(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png'],
      manifest: {
        name: 'ScanSend · Private QR File Transfer',
        short_name: 'ScanSend',
        description: 'Share photos and videos with expiring private QR links.',
        theme_color: '#087f82',
        background_color: '#f4f8fb',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/d\//],
        runtimeCaching: [],
      },
    }),
  ],
  server: { host: '0.0.0.0', port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
