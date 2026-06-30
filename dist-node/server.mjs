import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
const INSFORGE_URL = globalThis.INSFORGE_URL || "https://insforge.agrogestionx.com";
const INSFORGE_KEY = globalThis.INSFORGE_KEY || "ik_48c0eac742486d9c15b318e67ecec74689168ba0ff194451fffc930f1d2f5016";
const app = new Hono();
app.use("*", cors());
async function db(path, method = "GET", body) {
  const headers = {
    "Authorization": `Bearer ${INSFORGE_KEY}`,
    "Content-Type": "application/json"
  };
  if (method === "POST") headers["Prefer"] = "return=representation";
  const res = await fetch(`${INSFORGE_URL}/api/database/records${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : void 0
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`InsForge error ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
app.get("/api/tareas", async (c) => {
  const tareas = await db("/tareas?order=created_at.desc");
  return c.json(tareas);
});
app.post("/api/tareas", async (c) => {
  const { titulo, descripcion } = await c.req.json();
  if (!titulo) return c.json({ error: "titulo requerido" }, 400);
  const result = await db("/tareas", "POST", { titulo, descripcion });
  return c.json(result, 201);
});
app.patch("/api/tareas/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const result = await db(`/tareas?id=eq.${id}`, "PATCH", body);
  return c.json(result);
});
app.delete("/api/tareas/:id", async (c) => {
  const id = c.req.param("id");
  await db(`/tareas?id=eq.${id}`, "DELETE");
  return c.json({ ok: true });
});
app.get("/", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test App · InsForge</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="max-w-lg mx-auto pt-12 px-4">

    <!-- Header -->
    <div class="flex items-center gap-3 mb-8">
      <div class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-xl">✓</div>
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Lista de Tareas</h1>
        <p class="text-sm text-gray-500">Test · InsForge + Genspark Sandbox</p>
      </div>
      <span id="status" class="ml-auto text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-500">...</span>
    </div>

    <!-- Formulario -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
      <input id="titulo" type="text" placeholder="Nueva tarea..."
        class="w-full border border-gray-200 rounded-lg px-4 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      <input id="descripcion" type="text" placeholder="Descripción (opcional)"
        class="w-full border border-gray-200 rounded-lg px-4 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      <button onclick="crearTarea()"
        class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 rounded-lg text-sm transition">
        + Añadir tarea
      </button>
    </div>

    <!-- Lista -->
    <div id="lista" class="space-y-3"></div>

  </div>

  <script>
    async function cargarTareas() {
      try {
        const res = await fetch('/api/tareas')
        const tareas = await res.json()
        setStatus('✅ InsForge conectado', 'bg-emerald-100 text-emerald-700')
        const lista = document.getElementById('lista')
        lista.innerHTML = tareas.length === 0
          ? '<p class="text-center text-gray-400 text-sm py-8">No hay tareas aún</p>'
          : tareas.map(t => \`
            <div class="bg-white rounded-xl border \${t.completada ? 'border-gray-100 opacity-60' : 'border-gray-200'} p-4 flex items-start gap-3 shadow-sm">
              <input type="checkbox" \${t.completada ? 'checked' : ''}
                onchange="toggleTarea(\${t.id}, this.checked)"
                class="mt-0.5 accent-emerald-500 w-4 h-4 cursor-pointer" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 \${t.completada ? 'line-through text-gray-400' : ''}">\${t.titulo}</p>
                \${t.descripcion ? \`<p class="text-xs text-gray-400 mt-0.5">\${t.descripcion}</p>\` : ''}
                <p class="text-xs text-gray-300 mt-1">\${new Date(t.created_at).toLocaleString('es-ES')}</p>
              </div>
              <button onclick="eliminarTarea(\${t.id})"
                class="text-gray-300 hover:text-red-400 text-lg leading-none transition">×</button>
            </div>
          \`).join('')
      } catch (e) {
        setStatus('❌ Error conexión', 'bg-red-100 text-red-600')
      }
    }

    async function crearTarea() {
      const titulo = document.getElementById('titulo').value.trim()
      const descripcion = document.getElementById('descripcion').value.trim()
      if (!titulo) return
      await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descripcion })
      })
      document.getElementById('titulo').value = ''
      document.getElementById('descripcion').value = ''
      cargarTareas()
    }

    async function toggleTarea(id, completada) {
      await fetch(\`/api/tareas/\${id}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completada })
      })
      cargarTareas()
    }

    async function eliminarTarea(id) {
      await fetch(\`/api/tareas/\${id}\`, { method: 'DELETE' })
      cargarTareas()
    }

    function setStatus(msg, cls) {
      const el = document.getElementById('status')
      el.textContent = msg
      el.className = 'ml-auto text-xs px-2 py-1 rounded-full ' + cls
    }

    document.getElementById('titulo').addEventListener('keydown', e => {
      if (e.key === 'Enter') crearTarea()
    })

    cargarTareas()
  <\/script>
</body>
</html>`);
});
const port = parseInt(process.env.PORT || "3000");
console.log(`🚀 Servidor arrancando en puerto ${port}`);
serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0"
});
console.log(`✅ Servidor corriendo en http://0.0.0.0:${port}`);
