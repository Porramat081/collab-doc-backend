/**
 * Configuration preflight, run by docker-entrypoint.sh before migrations.
 *
 * Importing ./env.js performs every startup validation (JWT_SECRET, PORT range,
 * loopback database URLs). Running it here means a misconfigured variable is
 * reported by name, instead of surfacing later as an opaque driver error such as
 * "P1001: Can't reach database server at localhost:5432".
 */
import { env } from "./env.js";

/** Never print credentials into a deploy log. */
function redact(url: string | undefined): string {
  if (!url) return "(not set)";
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    // Multi-host URIs do not parse; strip anything between "//" and "@".
    return url.replace(/\/\/[^@/]*@/, "//***@");
  }
}

console.log("[preflight] NODE_ENV     :", env.NODE_ENV);
console.log("[preflight] PORT         :", env.PORT);
console.log("[preflight] DATABASE_URL :", redact(env.DATABASE_URL));
console.log("[preflight] MONGO_URI    :", redact(env.MONGO_URI));
console.log("[preflight] REDIS_URL    :", redact(env.REDIS_URL));
console.log("[preflight] Configuration OK");
