import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Backend URL comes from the environment — never hardcoded. Used here only as
  // the dev proxy target; in production the app talks to it directly.
  const apiTarget = env.VITE_API_BASE_URL

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    server: {
      // Dev-only: the app calls same-origin `/api/*` (see src/lib/api.js) and
      // Vite forwards those to the real backend server-side, so the browser
      // never makes a cross-origin request and CORS never applies. This lets a
      // phone on the LAN reach the backend by talking only to this dev server.
      // Invisible to production, which has no proxy and calls the backend directly.
      proxy: apiTarget
        ? {
            '/api': {
              target: apiTarget,
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
              headers: { 'ngrok-skip-browser-warning': 'true' },
            },
          }
        : undefined,
    },
  }
})
