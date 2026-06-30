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
  const semana = c.req.query("semana");
  const path = semana ? `/tareas?semana=eq.${semana}&order=created_at.desc` : `/tareas?order=created_at.desc`;
  const tareas = await db(path);
  return c.json(tareas);
});
app.post("/api/tareas", async (c) => {
  const { titulo, descripcion, semana } = await c.req.json();
  if (!titulo) return c.json({ error: "titulo requerido" }, 400);
  const result = await db("/tareas", "POST", {
    titulo,
    descripcion,
    semana: semana || "esta-semana"
  });
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
  <div class="max-w-2xl mx-auto pt-10 px-4 pb-12">

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
      <div class="flex gap-2 mb-3">
        <input id="titulo" type="text" placeholder="Nueva tarea..."
          class="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        <select id="semana"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="esta-semana">Esta semana</option>
          <option value="proxima-semana">Próxima semana</option>
          <option value="mas-adelante">Más adelante</option>
        </select>
      </div>
      <input id="descripcion" type="text" placeholder="Descripción (opcional)"
        class="w-full border border-gray-200 rounded-lg px-4 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      <button onclick="crearTarea()"
        class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 rounded-lg text-sm transition">
        + Añadir tarea
      </button>
    </div>

    <!-- Filtros de semana -->
    <div class="flex gap-2 mb-5">
      <button onclick="filtrar(null)"
        id="btn-todas"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition bg-emerald-500 text-white">
        Todas
      </button>
      <button onclick="filtrar('esta-semana')"
        id="btn-esta-semana"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition bg-white border border-gray-200 text-gray-600 hover:border-emerald-400">
        Esta semana
      </button>
      <button onclick="filtrar('proxima-semana')"
        id="btn-proxima-semana"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition bg-white border border-gray-200 text-gray-600 hover:border-emerald-400">
        Próxima semana
      </button>
      <button onclick="filtrar('mas-adelante')"
        id="btn-mas-adelante"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition bg-white border border-gray-200 text-gray-600 hover:border-emerald-400">
        Más adelante
      </button>
    </div>

    <!-- Lista -->
    <div id="lista" class="space-y-3"></div>

  </div>

  <script>
    const SEMANA_LABELS = {
      'esta-semana':    { label: 'Esta semana',    color: 'bg-emerald-100 text-emerald-700' },
      'proxima-semana': { label: 'Próxima semana', color: 'bg-blue-100 text-blue-700' },
      'mas-adelante':   { label: 'Más adelante',   color: 'bg-gray-100 text-gray-500' },
    }

    let filtroActivo = null

    async function cargarTareas() {
      try {
        const url = filtroActivo ? \`/api/tareas?semana=\${filtroActivo}\` : '/api/tareas'
        const res = await fetch(url)
        const tareas = await res.json()
        setStatus('✅ InsForge conectado', 'bg-emerald-100 text-emerald-700')
        const lista = document.getElementById('lista')
        lista.innerHTML = tareas.length === 0
          ? '<p class="text-center text-gray-400 text-sm py-8">No hay tareas en esta sección</p>'
          : tareas.map(t => {
              const s = SEMANA_LABELS[t.semana] || { label: t.semana, color: 'bg-gray-100 text-gray-500' }
              return \`
              <div class="bg-white rounded-xl border \${t.completada ? 'border-gray-100 opacity-60' : 'border-gray-200'} p-4 flex items-start gap-3 shadow-sm">
                <input type="checkbox" \${t.completada ? 'checked' : ''}
                  onchange="toggleTarea(\${t.id}, this.checked)"
                  class="mt-0.5 accent-emerald-500 w-4 h-4 cursor-pointer" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <p class="text-sm font-medium text-gray-800 \${t.completada ? 'line-through text-gray-400' : ''}">\${t.titulo}</p>
                    <span class="text-xs px-2 py-0.5 rounded-full \${s.color}">\${s.label}</span>
                  </div>
                  \${t.descripcion ? \`<p class="text-xs text-gray-400">\${t.descripcion}</p>\` : ''}
                  <p class="text-xs text-gray-300 mt-1">\${new Date(t.created_at).toLocaleString('es-ES')}</p>
                </div>
                <button onclick="eliminarTarea(\${t.id})"
                  class="text-gray-300 hover:text-red-400 text-lg leading-none transition">×</button>
              </div>\`
            }).join('')
      } catch (e) {
        setStatus('❌ Error conexión', 'bg-red-100 text-red-600')
      }
    }

    function filtrar(semana) {
      filtroActivo = semana
      // Actualizar botones
      const btns = {
        null: 'btn-todas',
        'esta-semana': 'btn-esta-semana',
        'proxima-semana': 'btn-proxima-semana',
        'mas-adelante': 'btn-mas-adelante'
      }
      Object.entries(btns).forEach(([k, id]) => {
        const btn = document.getElementById(id)
        if (k === String(semana)) {
          btn.className = 'px-4 py-1.5 rounded-full text-sm font-medium transition bg-emerald-500 text-white'
        } else {
          btn.className = 'px-4 py-1.5 rounded-full text-sm font-medium transition bg-white border border-gray-200 text-gray-600 hover:border-emerald-400'
        }
      })
      cargarTareas()
    }

    async function crearTarea() {
      const titulo = document.getElementById('titulo').value.trim()
      const descripcion = document.getElementById('descripcion').value.trim()
      const semana = document.getElementById('semana').value
      if (!titulo) return
      await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descripcion, semana })
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
