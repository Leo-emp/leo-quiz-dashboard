// ─────────────────────────────────────────────────────────────
// Vitest setup — runs before any tests are imported.
// Ensures tests use in-memory SQLite for idempotency.
// ─────────────────────────────────────────────────────────────

// Set the database URL to in-memory SQLite BEFORE any modules
// are imported. This ensures the db client in lib/db.ts uses
// :memory: instead of the persistent file:local.db
process.env.TURSO_DATABASE_URL = "file::memory:";
