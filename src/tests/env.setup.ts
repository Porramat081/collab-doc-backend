/**
 * Runs before any module is imported, so src/config/env.ts reads these values.
 * Keeps the suite hermetic: it must not depend on the developer's shell or .env.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.MONGO_URI ??= "mongodb://127.0.0.1:27017/collab_doc_test";
process.env.REDIS_URL = "";
