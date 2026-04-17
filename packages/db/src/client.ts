import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./index.js";
import { join } from "path";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "").replace("sqlite:", "") 
  || join(process.cwd(), "..", "data", "wired.db");

export const db = drizzle(new Database(DB_PATH), { schema });
export type DB = typeof db;
