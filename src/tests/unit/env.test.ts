import { isLoopbackUrl } from "../../config/env.js";

describe("isLoopbackUrl", () => {
  test.each([
    ["postgresql://postgres:postgres@localhost:5432/collaborative_docs?schema=public"],
    ["postgresql://postgres:postgres@127.0.0.1:5432/db"],
    ["postgresql://u:p@127.1.2.3:5432/db"],
    ["mongodb://root:mongo@localhost:27017/collaborative_docs?authSource=admin"],
    ["mongodb://localhost:27017/db"],
    ["redis://localhost:6379"],
    ["redis://127.0.0.1:6379"],
    ["redis://[::1]:6379"],
    ["postgresql://u:p@0.0.0.0:5432/db"],
    ["postgresql://u:p@host.docker.internal:5432/db"],
  ])("flags %s", (url) => {
    expect(isLoopbackUrl(url)).toBe(true);
  });

  test.each([
    // Railway private network
    ["postgresql://postgres:pw@postgres.railway.internal:5432/railway"],
    ["mongodb://mongo:pw@mongodb.railway.internal:27017"],
    ["redis://default:pw@redis.railway.internal:6379"],
    // Railway public proxy
    ["postgresql://postgres:pw@turntable.proxy.rlwy.net:41234/railway"],
    // docker compose service names — these must keep working
    ["postgresql://postgres:postgres@postgres:5432/collaborative_docs?schema=public"],
    ["mongodb://root:mongo@mongodb:27017/collaborative_docs?authSource=admin"],
    ["redis://redis:6379"],
    // Managed providers
    ["mongodb+srv://user:pw@cluster0.abcde.mongodb.net/db?retryWrites=true"],
  ])("allows %s", (url) => {
    expect(isLoopbackUrl(url)).toBe(false);
  });

  test("treats an unset value as fine", () => {
    expect(isLoopbackUrl(undefined)).toBe(false);
    expect(isLoopbackUrl("")).toBe(false);
  });

  test("still catches loopback in a multi-host URI that cannot be parsed", () => {
    // new URL() cannot parse a comma-separated host list; the textual fallback must.
    expect(isLoopbackUrl("mongodb://localhost:27017,localhost:27018/db?replicaSet=rs0")).toBe(
      true,
    );
    expect(
      isLoopbackUrl("mongodb://a.railway.internal:27017,b.railway.internal:27017/db"),
    ).toBe(false);
  });
});
