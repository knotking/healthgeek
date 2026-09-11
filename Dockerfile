# Portable image — runs on any container host, with no cloud provider involved.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=9002 \
    HOSTNAME=0.0.0.0 \
    HEALTHGEEK_DATA_DIR=/data

# next.config.ts sets output: 'standalone', so these three paths are all we need.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# The JSON document store lives here; mount a volume to keep it across restarts.
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME /data

EXPOSE 9002
CMD ["node", "server.js"]
