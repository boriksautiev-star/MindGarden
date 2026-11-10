import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const proxyConfig = {
  '/gigachat-auth': {
    target: 'https://ngw.devices.sberbank.ru:9443',
    changeOrigin: true,
    secure: false,
    rewrite: (path: string) => path.replace(/^\/gigachat-auth/, ''),
  },
  '/gigachat-api': {
    target: 'https://api.giga.chat',
    changeOrigin: true,
    secure: false,
    rewrite: (path: string) => path.replace(/^\/gigachat-api/, ''),
  },
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Мысленный сад',
        short_name: 'Мысли',
        description: 'Инструмент для структурирования мыслей',
        theme_color: '#ffffff',
        background_color: '#fafaf9',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    host: true,
    allowedHosts: ['resist-activated-charm-notified.trycloudflare.com'],
    proxy: proxyConfig
  },
  preview: {
    host: true,
    allowedHosts: ['resist-activated-charm-notified.trycloudflare.com'],
    proxy: proxyConfig
  }
});