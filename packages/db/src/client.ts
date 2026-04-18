import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./index.js";
import { ensureDatabase, resolveDatabasePath } from "./index.js";

const DB_PATH = resolveDatabasePath({
  rootDir: process.cwd(),
});

export const db = drizzle(ensureDatabase(DB_PATH), { schema });
export type DB = typeof db;
