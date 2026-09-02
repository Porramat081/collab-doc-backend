import "dotenv/config";

/**
 * Single place where process.env is read.
 *
 * Railway injects PORT and the database connection strings under provider-specific
 * names (MONGO_URL, REDIS_URL, DATABASE_URL), so every variable is looked up under
 * the aliases the different providers actually use.
 */

function firstDefined(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

const jwtSecret = firstDefined("JWT_SECRET");
if (isProduction && !jwtSecret) {
  throw new Error(
    "JWT_SECRET must be set in production. Generate one with: openssl rand -hex 32",
  );
}

/**
 * True when a connection string points at the machine it runs on.
 *
 * Inside a container "localhost" is the container itself, so a loopback host in a
 * deployed environment is always a copy-paste of local settings. Exported for tests.
 */
export function isLoopbackUrl(url: string | undefined): boolean {
  if (!url) return false;

  let host: string;
  try {
    // Multi-host URIs (mongodb://a:27017,b:27017/db) do not parse; fall back to a
    // textual check rather than rejecting a URL we simply cannot introspect.
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return /(^|@|\/\/)(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?|0\.0\.0\.0)(:|\/|,|$)/i.test(url);
  }

  const bare = host.replace(/^\[|\]$/g, "");
  return (
    bare === "localhost" ||
    bare === "::1" ||
    bare === "0.0.0.0" ||
    bare === "host.docker.internal" ||
    /^127\.\d+\.\d+\.\d+$/.test(bare)
  );
}

/**
 * Escape hatch for the rare deploy that genuinely reaches a database over a
 * loopback sidecar or SSH tunnel.
 */
const allowLoopback = firstDefined("ALLOW_LOCALHOST_DB") === "true";

function assertRoutable(
  url: string | undefined,
  variable: string,
  railwayReference: string,
): void {
  if (!isProduction || allowLoopback || !isLoopbackUrl(url)) return;

  throw new Error(
    `${variable} points at a loopback address (${url}).\n` +
      `  Inside a container "localhost" is the container itself, not your machine ` +
      `and not the database service.\n` +
      `  On Railway set: ${variable} = ${railwayReference}\n` +
      `  (Set ALLOW_LOCALHOST_DB=true only if you really do reach the database over ` +
      `a loopback tunnel.)`,
  );
}

const databaseUrl = firstDefined("DATABASE_URL", "POSTGRES_URL", "DATABASE_PRIVATE_URL");
const mongoUri = firstDefined(
  "MONGO_URI",
  "MONGO_URL",
  "MONGODB_URI",
  "MONGODB_URL",
  "MONGO_PRIVATE_URL",
);
const redisUrl = firstDefined("REDIS_URL", "REDIS_PRIVATE_URL", "REDIS_PUBLIC_URL");

// Fail loudly at boot rather than as an opaque driver timeout mid-deploy.
assertRoutable(databaseUrl, "DATABASE_URL", "${{Postgres.DATABASE_URL}}");
assertRoutable(mongoUri, "MONGO_URI", "${{MongoDB.MONGO_URL}}");
assertRoutable(redisUrl, "REDIS_URL", "${{Redis.REDIS_URL}}");

const port = Number(firstDefined("PORT") ?? 3001);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`Invalid PORT: "${process.env.PORT}". Expected an integer 1-65535.`);
}

export const env = {
  NODE_ENV,
  isProduction,
  isTest: NODE_ENV === "test",

  /** Railway assigns the public port through PORT; it must be honoured verbatim. */
  PORT: port,
  HOST: firstDefined("HOST") ?? "0.0.0.0",

  /** PostgreSQL (Prisma). */
  DATABASE_URL: databaseUrl,

  /** MongoDB (Mongoose) — document content, CRDT updates, presence.
   *  Validated in connectDB() rather than here, so that /health and the unit tests
   *  still work on a partially configured environment. */
  MONGO_URI: mongoUri,
  MONGO_DB_NAME: firstDefined("MONGO_DB_NAME", "MONGO_DB") ?? "collaborative_docs",

  /** Redis — cross-instance fan-out for CRDT/awareness frames. Optional: a single
   *  instance works without it, it is only needed once you scale past one replica. */
  REDIS_URL: redisUrl,
  /** ioredis defaults to `family: 4`, which cannot reach Railway's IPv6-only
   *  *.railway.internal hosts. 0 lets Node pick whichever stack resolves. */
  REDIS_FAMILY: Number(firstDefined("REDIS_FAMILY") ?? 0),

  JWT_SECRET: jwtSecret ?? "development-secret",
  JWT_EXPIRES_IN: firstDefined("JWT_EXPIRES_IN") ?? "7d",

  /** Comma-separated list of allowed origins, or "*" to allow any. */
  CORS_ORIGIN: firstDefined("CORS_ORIGIN") ?? "*",

  /** Seconds the entrypoint/bootstrap keeps retrying a database connection. */
  DB_CONNECT_TIMEOUT_MS: Number(firstDefined("DB_CONNECT_TIMEOUT_MS") ?? 30_000),
} as const;

export type Env = typeof env;
