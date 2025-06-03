# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install netcat for database connection check
RUN apk add --no-cache netcat-openbsd

# Copy necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src/migrations ./src/migrations
COPY --from=builder /app/src/config ./src/config
COPY --from=builder /app/tsconfig.json ./

ENV NODE_ENV=production

EXPOSE 3000

# Create a script to run migrations and start the app
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Use the entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"] 