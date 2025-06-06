# Dockerfile (project root)
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build the CLI
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 farm
RUN adduser --system --uid 1001 farm

COPY --from=builder --chown=farm:farm /app/packages/cli/dist ./cli
COPY --from=builder --chown=farm:farm /app/templates ./templates

USER farm

ENTRYPOINT ["node", "cli/farm.js"]