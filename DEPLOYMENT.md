# Deploying to Railway

The service builds from the repo `Dockerfile` (Railpack/Nixpacks is explicitly **not**
used — `railway.json` pins `"builder": "DOCKERFILE"`).

Railway does not run `docker-compose.yaml`. Postgres, MongoDB and Redis are each a
separate Railway service in the same project; the app reaches them over the private
network. `docker-compose.yaml` reproduces that same topology locally.

---

## 1. Create the databases

In your Railway project, add three services from the marketplace:

| Service    | Variable Railway exposes | Reference it as             |
| ---------- | ------------------------ | --------------------------- |
| PostgreSQL | `DATABASE_URL`           | `${{Postgres.DATABASE_URL}}` |
| MongoDB    | `MONGO_URL`              | `${{MongoDB.MONGO_URL}}`     |
| Redis      | `REDIS_URL`              | `${{Redis.REDIS_URL}}`       |

The exact service names (`Postgres`, `MongoDB`, `Redis`) are whatever you named them —
use those names in the `${{ ... }}` references.

## 2. Create the app service

Deploy this repo as a fourth service. Railway detects `railway.json` and builds the
`Dockerfile`. No further build configuration is needed.

## 3. Set the app service variables

```
DATABASE_URL   = ${{Postgres.DATABASE_URL}}
MONGO_URI      = ${{MongoDB.MONGO_URL}}
REDIS_URL      = ${{Redis.REDIS_URL}}
JWT_SECRET     = <output of: openssl rand -hex 32>
NODE_ENV       = production
CORS_ORIGIN    = https://your-frontend.example.com
```

> **Never paste `.env` or `.env.example` into Railway's Raw Editor.** Those files
> hold `localhost` URLs that are only meaningful on your own machine. Inside a
> container `localhost` is the container itself, so Prisma fails with
> `P1001: Can't reach database server at localhost:5432`. The app now refuses to
> boot in production with a loopback database URL and names the variable to fix.

Notes:

- **Do not set `PORT`.** Railway injects it and routes to that port; the app reads it
  and binds `0.0.0.0`. Hard-coding it is the single most common cause of a deploy that
  builds fine and then fails its health check.
- `JWT_SECRET` is mandatory — the app refuses to boot in production without it, rather
  than silently signing tokens with a well-known development string.
- `MONGO_DB_NAME` is optional (defaults to `collaborative_docs`). Set it if the database
  in your `MONGO_URL` path differs.
- `REDIS_URL` is optional with a single replica. It becomes required the moment you set
  `numReplicas > 1`, because that is what fans CRDT updates out across instances.

Then click **Generate Domain** on the app service to get a public URL.

## 4. What happens on each deploy

`docker-entrypoint.sh` runs before the server starts:

0. `node dist/config/preflight.js` — validates the environment and prints a
   credential-redacted summary. A bad variable aborts the deploy here, by name,
   before any driver gets a chance to report it as a generic timeout.
1. `prisma migrate deploy` — applies `prisma/migrations/` to Postgres, retrying up to
   10 times with a 5s backoff (a cold project starts the app before Postgres is ready).
2. `node dist/db/initialize-mongo.js` — creates MongoDB collections and indexes.
   Failures here are logged and non-fatal.
3. `exec node dist/app.js` — the server replaces the shell, so Railway's `SIGTERM`
   reaches Node and the graceful shutdown path runs.

Set `RUN_MIGRATIONS=false` to skip steps 1 and 2; the preflight always runs.

## 5. Health checks

| Path            | Meaning                                                          |
| --------------- | ---------------------------------------------------------------- |
| `/health`       | Liveness. Dependency-free, always 200 once listening.             |
| `/health/ready` | Readiness. Reports Postgres/Mongo/Redis status; 503 if degraded.  |

`railway.json` points the platform health check at `/health` deliberately: a transient
database blip should not restart-loop a container that is otherwise serving fine.

## 6. WebSockets

The Yjs collaboration socket shares the HTTP server and port, so it works over
Railway's generated domain with no extra configuration:

```
wss://<your-app>.up.railway.app/ws/documents?documentId=<uuid>
```

The JWT is passed as a WebSocket subprotocol pair: `["access_token", "<jwt>"]`.

A 30-second ping/pong keeps sessions alive through Railway's edge proxy, which closes
connections idle for roughly 60 seconds.

---

## Scaling past one replica

1. Add the Redis service and set `REDIS_URL`.
2. Raise `numReplicas` in `railway.json`.

Each instance publishes CRDT and awareness frames on `doc:<documentId>` and subscribes
to the rooms it holds locally, so editors on different instances converge.

One caveat before you scale: `SnapshotWorker` compacts a document when the **last local**
client disconnects. With several replicas, two instances can compact the same document
concurrently. The writes are idempotent, so this is safe, but it is wasted work — a
Redis lock around `processDocument` is the natural next step.

---

## Local development

Run the whole stack, including the production image:

```bash
docker compose up -d --build
```

Or run the databases in Docker and the app from source with hot reload:

```bash
docker compose up -d postgres mongodb redis
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

## Troubleshooting

| Symptom | Cause |
| ------- | ----- |
| Health check fails, logs show the server listening | `PORT` was set manually. Remove it. |
| `exec ./docker-entrypoint.sh: no such file or directory` | CRLF line endings. `.gitattributes` forces LF and the Dockerfile strips `\r`; re-clone if the file was committed with CRLF. |
| `Environment variable not found: DATABASE_URL` | The Postgres reference variable is missing on the **app** service. |
| `P1001: Can't reach database server at localhost:5432` | `DATABASE_URL` holds a local value. Set it to `${{Postgres.DATABASE_URL}}`. |
| `DATABASE_URL points at a loopback address` at boot | The guard above caught the same mistake before the driver timed out. Same fix; applies to `MONGO_URI` and `REDIS_URL` too. Override with `ALLOW_LOCALHOST_DB=true` only for a real loopback tunnel. |
| Redis `ETIMEDOUT` on a `*.railway.internal` host | Railway's private network is IPv6-only and ioredis defaults to IPv4. Handled: `src/config/env.ts` sets `family: 0` (override with `REDIS_FAMILY`). |
| `Transaction numbers are only allowed on a replica set` | Railway's MongoDB is standalone. Handled: the snapshot write falls back to non-transactional writes. |
