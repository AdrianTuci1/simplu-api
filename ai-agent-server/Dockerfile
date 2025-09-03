# Multi-stage build pentru optimizare
FROM node:23-alpine AS builder

# Setează working directory
WORKDIR /app

# Copiază package files
COPY package*.json ./
COPY tsconfig*.json ./

# Instalează dependențele
RUN npm ci --only=production && npm cache clean --force

# Copiază source code
COPY src/ ./src/
COPY config/ ./config/

# Build aplicația
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Instalează curl pentru health checks
RUN apk add --no-cache curl

# Creează user non-root pentru securitate
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Setează working directory
WORKDIR /app

# Copiază package files
COPY package*.json ./

# Instalează doar dependențele de producție
RUN npm ci --only=production && npm cache clean --force

# Copiază built application din builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copiază config files
COPY --from=builder --chown=nestjs:nodejs /app/config ./config

# Copiază și alte fișiere necesare
COPY --chown=nestjs:nodejs .env.example ./
COPY --chown=nestjs:nodejs README.md ./

# Setează ownership
RUN chown -R nestjs:nodejs /app

# Schimbă la user non-root
USER nestjs

# Expune portul
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1

# Setează variabilele de mediu
ENV NODE_ENV=production
ENV PORT=3003

# Comanda de start
CMD ["node", "dist/main.js"]

# Development stage (opțional)
FROM node:18-alpine AS development

# Setează working directory
WORKDIR /app

# Copiază package files
COPY package*.json ./

# Instalează toate dependențele (inclusiv dev dependencies)
RUN npm install

# Copiază source code
COPY . .

# Expune portul
EXPOSE 3003

# Setează variabilele de mediu
ENV NODE_ENV=development
ENV PORT=3003

# Comanda de start pentru development
CMD ["npm", "run", "start:dev"]
