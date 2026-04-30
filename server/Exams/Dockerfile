# Multi-stage build — imagen final ligera (~250MB con sharp) sin devDependencies

# ─── Stage 1: builder ───
FROM node:20-alpine AS builder
WORKDIR /app

# sharp y bcrypt necesitan dependencias nativas para compilar
RUN apk add --no-cache python3 make g++ libc6-compat

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

RUN npm prune --omit=dev

# ─── Stage 2: runner ───
FROM node:20-alpine AS runner
WORKDIR /app

# Runtime libs para sharp
RUN apk add --no-cache libc6-compat vips

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Crea las carpetas de uploads dentro del container (montadas como volumen)
RUN mkdir -p /app/uploads/images /app/uploads/pdfs /app/uploads/temp

RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3001

CMD ["node", "dist/server.js"]
