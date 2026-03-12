# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache curl

RUN addgroup -S nodejs && adduser -S -u 1001 -G nodejs nodejs

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist/ ./dist/
COPY data/ ./data/
COPY sources.yml ./

RUN chown -R nodejs:nodejs /app

ENV PORT=3000
EXPOSE 3000

USER nodejs

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["node", "dist/http-server.js"]
