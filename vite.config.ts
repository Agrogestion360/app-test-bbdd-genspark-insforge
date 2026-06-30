import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

const isNode = process.env.BUILD_TARGET === 'node'

export default defineConfig(isNode ? {
  // Build para Node.js (producción en Docker/Coolify)
  build: {
    target: 'node20',
    outDir: 'dist-node',
    ssr: true,
    rollupOptions: {
      input: 'src/server.ts',
      external: ['@hono/node-server'],
      output: {
        format: 'esm',
        entryFileNames: 'server.mjs',
      }
    }
  }
} : {
  // Build para Cloudflare Pages (desarrollo en sandbox)
  plugins: [
    build(),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ]
})
