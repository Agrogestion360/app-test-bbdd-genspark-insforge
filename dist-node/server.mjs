import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
const INSFORGE_URL = globalThis.INSFORGE_URL || "https://insforge.agrogestionx.com";
const INSFORGE_KEY = globalThis.INSFORGE_KEY || "ik_48c0eac742486d9c15b318e67ecec74689168ba0ff194451fffc930f1d2f5016";
const app = new Hono();
app.use("*", cors());
async function db(path, method = "GET", body, userToken) {
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
async function authApi(path, method, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${INSFORGE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : void 0
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, data };
}
function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "==".slice(payload.length % 4 || 4);
    const decoded = atob(padded);
    const data = JSON.parse(decoded);
    if (data.exp && data.exp < Math.floor(Date.now() / 1e3)) return null;
    return data;
  } catch {
    return null;
  }
}
async function requireAuth(c, next) {
  const token = getCookie(c, "session_token");
  if (!token) {
    return c.redirect("/login");
  }
  const payload = decodeJwt(token);
  if (!payload) {
    deleteCookie(c, "session_token", { path: "/" });
    return c.redirect("/login");
  }
  const displayName = payload.email?.split("@")[0] || "Usuario";
  c.set("user", { id: payload.sub, email: payload.email, profile: { name: displayName } });
  c.set("token", token);
  await next();
}
app.get("/login", (c) => {
  const token = getCookie(c, "session_token");
  if (token) return c.redirect("/");
  return c.html(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login · InsForge</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center px-4">
  <div class="w-full max-w-sm">

    <!-- Logo / Header -->
    <div class="text-center mb-8">
      <div class="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white text-2xl mx-auto mb-4">✓</div>
      <h1 class="text-2xl font-bold text-gray-800">Bienvenido</h1>
      <p class="text-sm text-gray-500 mt-1">Lista de Tareas · InsForge Auth</p>
    </div>

    <!-- Tabs -->
    <div class="flex rounded-xl bg-gray-100 p-1 mb-6">
      <button id="tab-login" onclick="switchTab('login')"
        class="flex-1 py-2 text-sm font-medium rounded-lg bg-white shadow-sm text-gray-800 transition">
        Iniciar sesión
      </button>
      <button id="tab-signup" onclick="switchTab('signup')"
        class="flex-1 py-2 text-sm font-medium rounded-lg text-gray-500 transition">
        Registrarse
      </button>
    </div>

    <!-- Formulario Login -->
    <div id="form-login" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input id="login-email" type="email" placeholder="tu@email.com"
          class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
        <input id="login-pass" type="password" placeholder="••••••••"
          class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>
      <div id="login-error" class="hidden text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2"></div>
      <button onclick="doLogin()"
        class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-lg text-sm transition">
        Iniciar sesión
      </button>
    </div>

    <!-- Formulario Signup -->
    <div id="form-signup" class="hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input id="signup-name" type="text" placeholder="Tu nombre"
          class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input id="signup-email" type="email" placeholder="tu@email.com"
          class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
        <input id="signup-pass" type="password" placeholder="Mínimo 8 caracteres"
          class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>
      <div id="signup-error" class="hidden text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2"></div>
      <div id="signup-ok" class="hidden text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-2"></div>
      <button onclick="doSignup()"
        class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-lg text-sm transition">
        Crear cuenta
      </button>
    </div>

  </div>

  <script>
    function switchTab(tab) {
      const isLogin = tab === 'login'
      document.getElementById('form-login').classList.toggle('hidden', !isLogin)
      document.getElementById('form-signup').classList.toggle('hidden', isLogin)
      document.getElementById('tab-login').className = isLogin
        ? 'flex-1 py-2 text-sm font-medium rounded-lg bg-white shadow-sm text-gray-800 transition'
        : 'flex-1 py-2 text-sm font-medium rounded-lg text-gray-500 transition'
      document.getElementById('tab-signup').className = !isLogin
        ? 'flex-1 py-2 text-sm font-medium rounded-lg bg-white shadow-sm text-gray-800 transition'
        : 'flex-1 py-2 text-sm font-medium rounded-lg text-gray-500 transition'
    }

    async function doLogin() {
      const email = document.getElementById('login-email').value.trim()
      const password = document.getElementById('login-pass').value
      const errEl = document.getElementById('login-error')
      errEl.classList.add('hidden')

      if (!email || !password) {
        errEl.textContent = 'Por favor, rellena todos los campos.'
        errEl.classList.remove('hidden')
        return
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        const data = await res.json()
        if (!res.ok) {
          errEl.textContent = data.error || 'Email o contraseña incorrectos.'
          errEl.classList.remove('hidden')
          return
        }
        window.location.href = '/'
      } catch (e) {
        errEl.textContent = 'Error de conexión. Inténtalo de nuevo.'
        errEl.classList.remove('hidden')
      }
    }

    async function doSignup() {
      const name = document.getElementById('signup-name').value.trim()
      const email = document.getElementById('signup-email').value.trim()
      const password = document.getElementById('signup-pass').value
      const errEl = document.getElementById('signup-error')
      const okEl = document.getElementById('signup-ok')
      errEl.classList.add('hidden')
      okEl.classList.add('hidden')

      if (!name || !email || !password) {
        errEl.textContent = 'Por favor, rellena todos los campos.'
        errEl.classList.remove('hidden')
        return
      }
      if (password.length < 8) {
        errEl.textContent = 'La contraseña debe tener al menos 8 caracteres.'
        errEl.classList.remove('hidden')
        return
      }

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        })
        const data = await res.json()
        if (!res.ok) {
          errEl.textContent = data.error || 'Error al crear la cuenta.'
          errEl.classList.remove('hidden')
          return
        }
        okEl.textContent = '¡Cuenta creada! Iniciando sesión...'
        okEl.classList.remove('hidden')
        setTimeout(() => window.location.href = '/', 1000)
      } catch (e) {
        errEl.textContent = 'Error de conexión. Inténtalo de nuevo.'
        errEl.classList.remove('hidden')
      }
    }

    // Enter para submit
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const loginHidden = document.getElementById('form-login').classList.contains('hidden')
        loginHidden ? doSignup() : doLogin()
      }
    })
  <\/script>
</body>
</html>`);
});
app.post("/api/auth/signup", async (c) => {
  try {
    const { name, email, password } = await c.req.json();
    if (!email || !password || !name) {
      return c.json({ error: "name, email y password son requeridos" }, 400);
    }
    const { ok, status, data } = await authApi(
      "/api/auth/users",
      "POST",
      { email, password, name },
      INSFORGE_KEY
    );
    if (!ok) {
      const msg = data?.message || data?.error || "Error al registrar usuario";
      return c.json({ error: msg }, status);
    }
    if (data.accessToken) {
      setCookie(c, "session_token", data.accessToken, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        // 7 días
        sameSite: "Lax"
      });
    }
    return c.json({
      ok: true,
      user: { id: data.user?.id, email: data.user?.email, name: data.user?.profile?.name }
    });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});
app.post("/api/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "email y password son requeridos" }, 400);
    }
    const { ok, status, data } = await authApi(
      "/api/auth/sessions",
      "POST",
      { email, password }
    );
    if (!ok) {
      return c.json({ error: "Email o contraseña incorrectos" }, 401);
    }
    setCookie(c, "session_token", data.accessToken, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "Lax"
    });
    return c.json({
      ok: true,
      user: { id: data.user?.id, email: data.user?.email, name: data.user?.profile?.name }
    });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});
app.post("/api/auth/logout", (c) => {
  deleteCookie(c, "session_token", { path: "/" });
  return c.json({ ok: true });
});
app.get("/api/auth/me", (c) => {
  const token = getCookie(c, "session_token");
  if (!token) return c.json({ user: null }, 401);
  const payload = decodeJwt(token);
  if (!payload) return c.json({ user: null }, 401);
  return c.json({
    user: { id: payload.sub, email: payload.email, name: payload.name || payload.email }
  });
});
app.get("/api/tareas", requireAuth, async (c) => {
  const semana = c.req.query("semana");
  const path = semana ? `/tareas?semana=eq.${semana}&order=created_at.desc` : `/tareas?order=created_at.desc`;
  const tareas = await db(path);
  return c.json(tareas);
});
app.post("/api/tareas", requireAuth, async (c) => {
  const { titulo, descripcion, semana } = await c.req.json();
  if (!titulo) return c.json({ error: "titulo requerido" }, 400);
  const result = await db("/tareas", "POST", {
    titulo,
    descripcion,
    semana: semana || "esta-semana"
  });
  return c.json(result, 201);
});
app.patch("/api/tareas/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const result = await db(`/tareas?id=eq.${id}`, "PATCH", body);
  return c.json(result);
});
app.delete("/api/tareas/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  await db(`/tareas?id=eq.${id}`, "DELETE");
  return c.json({ ok: true });
});
app.get("/", requireAuth, (c) => {
  const user = c.get("user");
  return c.html(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test App · InsForge</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="max-w-2xl mx-auto pt-8 px-4 pb-12">

    <!-- Header con usuario -->
    <div class="flex items-center gap-3 mb-8">
      <div class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-xl">✓</div>
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Lista de Tareas</h1>
        <p class="text-sm text-gray-500">Test · InsForge + Auth</p>
      </div>
      <!-- User info + logout -->
      <div class="ml-auto flex items-center gap-3">
        <div class="text-right hidden sm:block">
          <p class="text-xs font-medium text-gray-700">${user?.profile?.name || "Usuario"}</p>
          <p class="text-xs text-gray-400">${user?.email || ""}</p>
        </div>
        <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
          ${(user?.profile?.name || user?.email || "U").charAt(0).toUpperCase()}
        </div>
        <button onclick="logout()"
          class="text-xs text-gray-400 hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50">
          Salir
        </button>
      </div>
    </div>

    <!-- Banner conexión -->
    <div class="flex items-center gap-2 mb-6 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
      <span>🔐</span>
      <span>Sesión activa · InsForge Auth</span>
      <span id="status" class="ml-auto font-medium">Cargando...</span>
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

    <!-- Filtros -->
    <div class="flex gap-2 mb-5 flex-wrap">
      <button onclick="filtrar(null)" id="btn-todas"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition bg-emerald-500 text-white">Todas</button>
      <button onclick="filtrar('esta-semana')" id="btn-esta-semana"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition bg-white border border-gray-200 text-gray-600 hover:border-emerald-400">Esta semana</button>
      <button onclick="filtrar('proxima-semana')" id="btn-proxima-semana"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition bg-white border border-gray-200 text-gray-600 hover:border-emerald-400">Próxima semana</button>
      <button onclick="filtrar('mas-adelante')" id="btn-mas-adelante"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition bg-white border border-gray-200 text-gray-600 hover:border-emerald-400">Más adelante</button>
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
        if (res.status === 401 || res.redirected) { window.location.href = '/login'; return }
        const tareas = await res.json()
        document.getElementById('status').textContent = tareas.length + ' tareas'
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
                  <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p class="text-sm font-medium text-gray-800 \${t.completada ? 'line-through text-gray-400' : ''}">\${t.titulo}</p>
                    <span class="text-xs px-2 py-0.5 rounded-full \${s.color}">\${s.label}</span>
                  </div>
                  \${t.descripcion ? \`<p class="text-xs text-gray-400">\${t.descripcion}</p>\` : ''}
                  <p class="text-xs text-gray-300 mt-1">\${new Date(t.created_at).toLocaleString('es-ES')}</p>
                </div>
                <button onclick="eliminarTarea(\${t.id})"
                  class="text-gray-300 hover:text-red-400 text-lg leading-none transition ml-2">×</button>
              </div>\`
            }).join('')
      } catch (e) {
        document.getElementById('status').textContent = 'Error conexión'
      }
    }

    function filtrar(semana) {
      filtroActivo = semana
      const btns = { 'null': 'btn-todas', 'esta-semana': 'btn-esta-semana', 'proxima-semana': 'btn-proxima-semana', 'mas-adelante': 'btn-mas-adelante' }
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
      const res = await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descripcion, semana })
      })
      if (res.status === 401) { window.location.href = '/login'; return }
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
      if (!confirm('¿Eliminar esta tarea?')) return
      await fetch(\`/api/tareas/\${id}\`, { method: 'DELETE' })
      cargarTareas()
    }

    async function logout() {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
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
