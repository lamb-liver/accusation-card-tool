import { defineConfig } from 'vite'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

function ensurePwaSwOutput(pwaPlugins) {
  let resolvedConfig

  return {
    name: 'ensure-pwa-sw-output',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      resolvedConfig = config
    },
    closeBundle: {
      sequential: true,
      async handler() {
        if (!resolvedConfig || resolvedConfig.build.ssr) return

        const pwaMainPlugin = pwaPlugins.find((plugin) => plugin?.name === 'vite-plugin-pwa')
        const pwaApi = pwaMainPlugin?.api
        if (!pwaApi || pwaApi.disabled) return

        const outDirPath = resolve(resolvedConfig.root, resolvedConfig.build.outDir)
        const swPath = resolve(outDirPath, 'sw.js')
        if (!existsSync(swPath)) {
          await pwaApi.generateSW()
        }

        if (!existsSync(swPath)) {
          throw new Error('PWA service worker output missing: expected dist/sw.js')
        }
      },
    },
  }
}

/** @param {'development' | 'production'} viteMode */
function createPwaPlugins(viteMode) {
  return VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg'],
  manifest: {
    name: '控訴 - 查卡＆組牌工具',
    short_name: '控訴',
    description: '控訴卡牌查詢、組牌與常見問題',
    lang: 'zh-TW',
    dir: 'ltr',
    theme_color: '#1a1a1a',
    background_color: '#1a1a1a',
    display: 'standalone',
    start_url: '/',
    scope: '/',
    icons: [
      {
        src: '/favicon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  },
  workbox: {
    mode: viteMode === 'production' ? 'production' : 'development',
    globPatterns: ['**/*.{js,css,html,ico,svg,wasm}'],
    navigateFallback: 'index.html',
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
      {
        urlPattern: ({ url }) => /\.(?:webp|avif)$/i.test(url.pathname),
        handler: 'CacheFirst',
        options: {
          cacheName: 'accusation-webp',
          expiration: {
            maxEntries: 800,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: ({ url }) => /\.png$/i.test(url.pathname) && /\/images\//i.test(url.pathname),
        handler: 'CacheFirst',
        options: {
          cacheName: 'accusation-png-icons',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: ({ url }) => /\/assets\/.*\.(?:js|mjs|css)$/i.test(url.pathname),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'accusation-bundled-assets',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: ({ url }) =>
          url.pathname.endsWith('cards.json') || url.pathname.startsWith('/cards/'),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'accusation-card-data',
          expiration: {
            maxEntries: 8,
            maxAgeSeconds: 60 * 60 * 24,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})
}

// Keep @vitejs/plugin-react-swc on its SWC build transform so Vite 8/Rolldown
// does not receive the plugin's deprecated esbuild JSX config.
function keepSwcBuildTransform() {}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const pwaPlugins = createPwaPlugins(mode)
  return {
  plugins: [
    react({ useAtYourOwnRisk_mutateSwcOptions: keepSwcBuildTransform }),
    tailwindcss(),
    ...pwaPlugins,
    ensurePwaSwOutput(pwaPlugins),
  ],
  build: {
    target: 'esnext',
    sourcemap: false,
    cssCodeSplit: true,
    cssMinify: true,
    minify: true,
    modulePreload: { polyfill: true },
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      treeshake: true,
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  };
});
