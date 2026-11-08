import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  server: {
    host: true, // 允许局域网 IP 访问（0.0.0.0）
    proxy: {
      '/api': {
        target: env.VITE_API_BASE_URL,
        changeOrigin: false,
        ws: true,
        configure: (proxy) => {
          proxy.on('proxyReqWs', (proxyRequest, request) => {
            const host = request.headers.host
            const origin = request.headers.origin
            const protocols = request.headers['sec-websocket-protocol']
            if (host) proxyRequest.setHeader('host', host)
            if (origin) proxyRequest.setHeader('origin', origin)
            if (protocols) {
              proxyRequest.setHeader('sec-websocket-protocol', protocols)
              const [scheme, token] = protocols.split(',').map((value) =>
                value.trim()
              )
              if (scheme === 'jwt' && token)
                proxyRequest.setHeader('authorization', `Bearer ${token}`)
            }
          })
        },
      },
    },
  },
  preview: {
    host: true,
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}});
