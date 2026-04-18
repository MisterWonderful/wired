import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ensureDatabase, resolveDatabasePath } from "./bootstrap.js";

test("resolveDatabasePath prefers explicit DATABASE_URL values", () => {
  const rootDir = "/repo/root";
  const resolved = resolveDatabasePath({
    rootDir,
    databaseUrl: "file:/tmp/custom/wired.db",
  });

  assert.equal(resolved, path.resolve("/tmp/custom/wired.db"));
});

test("resolveDatabasePath falls back to repo-root data directory", () => {
  const resolved = resolveDatabasePath({ rootDir: "/repo/root" });

  assert.equal(resolved, path.resolve("/repo/root/data/wired.db"));
});

test("ensureDatabase creates the parent directory and initializes schema", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "wired-db-"));
  const dbPath = path.join(tempRoot, "nested", "data", "wired.db");

  try {
    const db = ensureDatabase(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>;

    assert.ok(tables.some((table) => table.name === "project"));
    assert.ok(tables.some((table) => table.name === "user_settings"));
    assert.ok(tables.some((table) => table.name === "note_sync_state"));
    db.close();
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
