FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Solo las dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev

# Wrangler necesita estar disponible para servir el worker
RUN npm install wrangler

# Copiar el build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/wrangler.jsonc ./wrangler.jsonc

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npx", "wrangler", "pages", "dev", "dist", "--ip", "0.0.0.0", "--port", "3000"]
