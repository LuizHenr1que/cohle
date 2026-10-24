# Cohle API. Build context = repository root:  docker build -f apps/server/Dockerfile .
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
 && corepack enable
WORKDIR /app

# dependencies first (cached unless a package.json / the lockfile changes)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --filter "@cohle/server..."

COPY packages/shared packages/shared
COPY apps/server apps/server
RUN pnpm --filter @cohle/server exec prisma generate

ENV NODE_ENV=production PORT=3001
EXPOSE 3001
# apply pending database migrations, then start
CMD ["sh", "-c", "pnpm --filter @cohle/server exec prisma migrate deploy && pnpm --filter @cohle/server exec tsx src/index.ts"]
