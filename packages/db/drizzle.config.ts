import { defineConfig } from "drizzle-kit";
import path from "path";

const dbPath = path.resolve(process.env.HOME || "/home/ryan", "homelab/wired/data/wired.db");

export default defineConfig({
  schema: "./src/index.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || dbPath,
  },
});
