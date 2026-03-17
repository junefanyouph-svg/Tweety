import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function getBuildId() {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return `local-${Date.now()}`
  }
}

function buildVersionPlugin(buildId) {
  return {
    name: 'build-version-plugin',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({
          buildId,
          builtAt: new Date().toISOString()
        }, null, 2)
      })
    }
  }
}

const buildId = getBuildId()

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId)
  },
  plugins: [
    react(),
    tailwindcss(),
    buildVersionPlugin(buildId),
  ],
})
