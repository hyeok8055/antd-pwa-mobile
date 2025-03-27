import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1년
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        maximumFileSizeToCacheInBytes: 5000000, // 5MB로 설정 (필요에 따라 조정)
      },
      manifest: {
        name: 'Calorie Sync',
        short_name: 'Calorie Sync',
        description: 'Calorie Sync는 섭취한 칼로리와 나의 예측치를 비교하여 칼로리 관리를 도와줍니다.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
            {
              src: "./icons/apple-touch-icon-57x57.png",
              sizes: "57x57",
              type: "image/png"
            },
            {
              src: "./icons/apple-touch-icon-60x60.png",
              sizes: "60x60",
              type: "image/png"
            },
            {
              src: "./icons/apple-touch-icon-72x72.png",
              sizes: "72x72",
              type: "image/png"
            },
            {
              src: "./icons/apple-touch-icon-76x76.png",
              sizes: "76x76",
              type: "image/png"
            },
            {
              src: "./icons/apple-touch-icon-114x114.png",
              sizes: "114x114",
              type: "image/png"
            },
            {
              src: "./icons/apple-touch-icon-120x120.png",
              sizes: "120x120",
              type: "image/png"
            },

            {
              "src": "./icons/apple-touch-icon-144x144.png",
              sizes: "144x144",
              type: "image/png"
            },
            {
              "src": "./icons/apple-touch-icon-152x152.png",
              sizes: "152x152",
              type: "image/png"
            },
            {
              "src": "./icons/maskable_icon_x48.png",
              sizes: "48x48",
              type: "image/png"
            },
            {
              "src": "./icons/maskable_icon_x72.png",
              sizes: "72x72",
              type: "image/png"
            },
            {
              "src": "./icons/maskable_icon_x96.png",
              sizes: "96x96",
              type: "image/png"
            },
            {
              "src": "./icons/maskable_icon_x128.png",
              sizes: "128x128",
              type: "image/png"
            },
            {
              "src": "./icons/maskable_icon_x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              "src": "./icons/maskable_icon_x384.png",
              sizes: "384x384",
              type: "image/png"
            },
            {
              "src": "./icons/maskable_icon_x512.png",
              sizes: "512x512",
              type: "image/png"
            }
          ]
      },
      gcm_sender_id: '830533101887' // Firebase Cloud Messaging sender ID
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  server: {
    headers: {
      'Service-Worker-Allowed': '/'
    }
  }
});