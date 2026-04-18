import { defineConfig } from "drizzle-kit";
import { resolveDatabasePath } from "./src/bootstrap.js";

export default defineConfig({
  schema: "./src/index.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: resolveDatabasePath({
      databaseUrl: process.env.DATABASE_URL,
      rootDir: pathResolveFromConfig(),
    }),
  },
});

function pathResolveFromConfig(): string {
  return new URL("../..", import.meta.url).pathname;
}
