#!/bin/sh
# Container startup: bring the schemas up to date, then hand PID 1 to the server.
set -eu

PRISMA="./node_modules/.bin/prisma"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
MIGRATION_RETRIES="${MIGRATION_RETRIES:-10}"

log() { echo "[entrypoint] $*"; }

if [ "$RUN_MIGRATIONS" = "true" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    log "DATABASE_URL is not set - skipping PostgreSQL migrations."
  else
    log "Applying PostgreSQL migrations..."
    attempt=1
    until "$PRISMA" migrate deploy; do
      if [ "$attempt" -ge "$MIGRATION_RETRIES" ]; then
        log "ERROR: migrations failed after ${attempt} attempts."
        exit 1
      fi
      # A fresh Railway deploy often starts the app before Postgres accepts
      # connections; back off and retry rather than crash-looping the service.
      log "Migration attempt ${attempt}/${MIGRATION_RETRIES} failed, retrying in 5s..."
      attempt=$((attempt + 1))
      sleep 5
    done
    log "PostgreSQL migrations applied."
  fi

  # Index creation is idempotent and non-critical: never block a boot on it.
  log "Ensuring MongoDB collections and indexes..."
  if node dist/db/initialize-mongo.js; then
    log "MongoDB initialized."
  else
    log "WARNING: MongoDB initialization failed; the app will retry its own connection."
  fi
else
  log "RUN_MIGRATIONS=false - skipping schema setup."
fi

log "Starting application..."
# exec so the Node process becomes PID 1's child and receives SIGTERM directly.
exec node dist/app.js
