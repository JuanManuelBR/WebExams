# Multi-stage build — imagen final ligera (~150MB) sin devDependencies

# ─── Stage 1: builder ───
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# Quita devDependencies para copiar solo prod node_modules a la imagen final
RUN npm prune --omit=dev

# ─── Stage 2: runner ───
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copia solo lo necesario para correr
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Usuario no-root por seguridad
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3000

CMD ["node", "dist/server.js"]
