import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDatabase, resolveDatabasePath } from "@wired/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..", "..", "..");
const REPO_ROOT = path.resolve(WEB_ROOT, "..", "..");
const DB_PATH = resolveDatabasePath({
  databaseUrl: process.env.DATABASE_URL,
  rootDir: REPO_ROOT,
});

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = ensureDatabase(DB_PATH);
  }
  return _db;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createId(): string {
  return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 11);
}
