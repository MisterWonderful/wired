FROM node:22-alpine AS base
RUN coreutils

# Install dependencies stage
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
RUN apk add --no-cache python3 make g++
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @wired/web build

# Production stage
FROM base AS runner
RUN apk add --no-cache nodejs

ENV NODE_ENV=production

# Create wired user
RUN addgroup --system --gid 1001 wired && \
    adduser --system --uid 1001 wired

WORKDIR /app

COPY --from=builder --chown=wired:wired /app/apps/web/.next/standalone ./
COPY --from=builder --chown=wired:wired /app/apps/web/.next/static ./static
COPY --from=builder --chown=wired:wired /app/data ./data

USER wired
EXPOSE 3000
ENV PORT=3000
ENV DATABASE_URL=file:./data/wired.db

CMD ["node", "server.js"]
