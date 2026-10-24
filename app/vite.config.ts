import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

const requiredEnv = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const

export default defineConfig(({ command, mode }) => {
  // Fail the build instead of shipping a blank page when the Supabase settings
  // are missing from the host (Vercel project environment variables).
  if (command === 'build') {
    const env = loadEnv(mode, r('./'), 'VITE_')
    const missing = requiredEnv.filter((key) => !env[key])
    if (missing.length > 0) {
      throw new Error(
        `Missing build environment variables: ${missing.join(', ')}. ` +
          'Set them in the Vercel project settings (or app/.env locally) and redeploy.',
      )
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': r('./src'),
      },
    },
  }
})
