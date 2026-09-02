#
# Production image for Railway (Builder = Dockerfile, not Railpack).
#
# Multi-stage so the final image ships only: node_modules (prod), dist/, prisma/.
# Debian slim rather than Alpine because Prisma's query engine needs glibc+OpenSSL 3;
# it matches the "debian-openssl-3.0.x" binaryTarget in prisma/schema.prisma.

ARG NODE_VERSION=24

# ---------------------------------------------------------------------------
# base — shared runtime layer
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# build — full dependency tree, compile TypeScript to ESM in dist/
# ---------------------------------------------------------------------------
FROM base AS build
ENV NODE_ENV=development
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN ./node_modules/.bin/prisma generate \
    && ./node_modules/.bin/tsc -p tsconfig.build.json

# ---------------------------------------------------------------------------
# prod-deps — production dependencies only, with the Prisma client generated
# ---------------------------------------------------------------------------
FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --no-audit --no-fund \
    && ./node_modules/.bin/prisma generate \
    && npm cache clean --force

# ---------------------------------------------------------------------------
# runner — final image
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY docker-entrypoint.sh ./

# Strip CRLF: the script is authored on Windows, and /bin/sh cannot execute a
# shebang line that ends in \r ("no such file or directory" at container start).
RUN sed -i 's/\r$//' docker-entrypoint.sh \
    && chmod +x docker-entrypoint.sh \
    && chown -R node:node /app

USER node

# Documentation only — Railway injects its own PORT and routes to it.
EXPOSE 3001

# Used by docker compose locally; Railway uses healthcheckPath in railway.json.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "const p=process.env.PORT||3001;require('http').get('http://127.0.0.1:'+p+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# No init shim: docker-entrypoint.sh ends in `exec node dist/app.js`, so Node
# becomes PID 1 itself and Railway's SIGTERM reaches the graceful shutdown
# handler in src/app.ts directly. The app spawns no long-lived children, so
# there is nothing for an init process to reap.
CMD ["./docker-entrypoint.sh"]
