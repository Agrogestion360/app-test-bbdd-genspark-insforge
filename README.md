# app-test-workflow-bbdd

App de test para validar el workflow completo:
**Genspark Sandbox → GitHub → Coolify (VPS) → InsForge (PostgreSQL)**

## Stack

- **Frontend + Backend**: Node.js + Hono framework
- **Base de datos**: InsForge (PostgreSQL self-hosted)
- **Deploy**: Coolify en VPS
- **CI/CD**: GitHub → Coolify webhook automático

## Funcionalidad

Lista de tareas (TODO) simple que prueba:
- ✅ GET tareas
- ✅ POST nueva tarea
- ✅ PATCH (completar/descompletar)
- ✅ DELETE tarea

## Variables de entorno

Crear `.env` con:
```
INSFORGE_URL=https://tu-insforge.com
INSFORGE_KEY=tu-api-key
```

## Desarrollo local

```bash
npm install
npm run dev
```

## Deploy

El deploy es automático via Coolify al hacer push a `main`.

## URLs

- **App**: https://tu-dominio.com
- **InsForge**: https://insforge.agrogestionx.com
