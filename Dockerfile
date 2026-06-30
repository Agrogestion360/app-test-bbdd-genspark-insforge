FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build para Node.js (producción)
RUN npm run build:node

# ── Runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Solo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar el build Node.js
COPY --from=builder /app/dist-node ./dist-node

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist-node/server.mjs"]
