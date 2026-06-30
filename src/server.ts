import { serve } from '@hono/node-server'
import app from './index'

const port = parseInt(process.env.PORT || '3000')

console.log(`🚀 Servidor arrancando en puerto ${port}`)

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
})

console.log(`✅ Servidor corriendo en http://0.0.0.0:${port}`)
