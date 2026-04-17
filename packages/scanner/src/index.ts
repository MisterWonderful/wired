import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname, basename } from "path";

// File scan candidate type
export interface FileScanCandidate {
  path: string; sizeBytes: number; extension: string;
  lastModifiedAt?: string; changedSinceLastScan: boolean; mentionedInCommit: boolean;
  containsTodo: boolean; isConfig: boolean; isReadmeOrDoc: boolean;
  isEntryPoint: boolean; isTest: boolean; isIgnored: boolean;
}
export interface RankedFileCandidate extends FileScanCandidate {
  relevanceScore: number; reasonCodes: string[];
}

const IGNORED_DIRS = [
  "node_modules", ".git", "dist", "build", ".next", "out", "coverage",
  "target", "vendor", ".turbo", ".cache", ".pnpm", ".yarn", "__pycache__",
];
const ENTRY_PATTERNS = ["index.ts", "index.tsx", "index.js", "index.jsx", "main.ts", "main.tsx", "main.js", "main.jsx", "app.ts", "app.tsx", "app.js", "server.ts", "server.js"];
const CONFIG_FILES = ["package.json", "tsconfig.json", "vite.config.ts", "vite.config.js", "next.config.ts", "next.config.js", "tailwind.config.ts", "tailwind.config.js", "prisma/schema.prisma", "drizzle.config.ts", "docker-compose.yml", "Dockerfile", ".env.example", "pyproject.toml", "requirements.txt", "go.mod", "Cargo.toml", "composer.json", "Makefile"];
const DOC_PATTERNS = ["readme.md", "changelog.md", "roadmap.md", "todo.md", "contributing.md", "license.md", "docs/readme.md"];
const TEST_PATTERNS = ["test.ts", "test.tsx", "spec.ts", "spec.tsx", ".test.", ".spec.", "__tests__", "tests/", "e2e/"];

function scoreFile(c: FileScanCandidate): { score: number; reasons: string[] } {
  let score = 0; const reasons: string[] = [];
  if (c.changedSinceLastScan) { score += 40; reasons.push("changedSinceLastScan"); }
  if (c.isReadmeOrDoc) { score += 35; reasons.push("readmeOrDoc"); }
  if (c.isConfig) { score += 25; reasons.push("config"); }
  if (c.isEntryPoint) { score += 25; reasons.push("entryPoint"); }
  if (c.mentionedInCommit) { score += 20; reasons.push("inRecentCommit"); }
  if (c.containsTodo) { score += 15; reasons.push("containsTodo"); }
  if (c.isTest) { score += 10; reasons.push("test"); }
  if (c.sizeBytes > 100_000) { score -= 30; reasons.push("oversized"); }
  if (c.isIgnored) { score -= 100; reasons.push("ignored"); }
  return { score, reasons };
}

export function scanDirectory(dirPath: string, maxFiles = 200, maxSizeBytes = 100_000): FileScanCandidate[] {
  const candidates: FileScanCandidate[] = [];
  function walk(dir: string) {
    if (candidates.length >= maxFiles) return;
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (candidates.length >= maxFiles) break;
        const fullPath = join(dir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            if (!IGNORED_DIRS.includes(entry) && !entry.startsWith(".")) walk(fullPath);
          } else if (stat.isFile()) {
            const ext = extname(entry).toLowerCase();
            const relativePath = fullPath.replace(dir + "/", "");
            const baseName = basename(entry);
            const size = stat.size;
            let content = "";
            if (size < maxSizeBytes) { try { content = readFileSync(fullPath, "utf-8").slice(0, 8000); } catch {} }
            const todoRegex = /\\bTODO\\b|\\bFIXME\\b|\\bXXX\\b/i;
            candidates.push({
              path: relativePath, sizeBytes: size, extension: ext,
              lastModifiedAt: stat.mtime.toISOString(),
              changedSinceLastScan: false, mentionedInCommit: false,
              containsTodo: todoRegex.test(content),
              isConfig: CONFIG_FILES.some(f => relativePath.endsWith(f) || baseName === f),
              isReadmeOrDoc: DOC_PATTERNS.some(f => relativePath.toLowerCase().endsWith(f)),
              isEntryPoint: ENTRY_PATTERNS.includes(baseName),
              isTest: TEST_PATTERNS.some(f => relativePath.includes(f)),
              isIgnored: IGNORED_DIRS.some(ign => relativePath.includes(ign)),
            });
          }
        } catch {}
      }
    } catch {}
  }
  walk(dirPath);
  return candidates;
}

export function rankFiles(candidates: FileScanCandidate[]): RankedFileCandidate[] {
  return candidates.filter(f => !f.isIgnored).map(f => {
    const { score, reasons } = scoreFile(f);
    return { ...f, relevanceScore: score, reasonCodes: reasons };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function buildContextBundle(ranked: RankedFileCandidate[], maxTokens = 120_000): string {
  const parts: string[] = []; let tokenCount = 0;
  for (const file of ranked) {
    if (file.sizeBytes > 100_000) continue;
    if (parts.length >= 75) break;
    try {
      const content = readFileSync(file.path, "utf-8");
      const fileTokens = Math.ceil(content.length / 4);
      if (tokenCount + fileTokens > maxTokens) break;
      const ext = file.extension.slice(1) || "text";
      parts.push("## " + file.path + "\n```" + ext + "\n" + content + "\n```\n");
      tokenCount += fileTokens;
    } catch {}
  }
  return parts.join("\n");
}

export function detectTechStack(dirPath: string): string[] {
  const stack: string[] = [];
  try {
    const files = readdirSync(dirPath);
    if (files.includes("package.json")) stack.push("Node.js");
    if (files.includes("pnpm-lock.yaml")) stack.push("pnpm");
    if (files.includes("yarn.lock")) stack.push("Yarn");
    if (files.includes("go.mod")) stack.push("Go");
    if (files.includes("Cargo.toml")) stack.push("Rust");
    if (files.includes("pyproject.toml")) stack.push("Python");
    if (files.includes("tsconfig.json")) stack.push("TypeScript");
    if (files.includes("next.config.ts") || files.includes("next.config.js")) stack.push("Next.js");
    if (files.includes("vite.config.ts")) stack.push("Vite");
    if (files.includes("prisma/schema.prisma")) stack.push("Prisma");
    if (files.includes("drizzle.config.ts")) stack.push("Drizzle ORM");
    if (files.includes("docker-compose.yml") || files.includes("Dockerfile")) stack.push("Docker");
  } catch {}
  return stack;
}