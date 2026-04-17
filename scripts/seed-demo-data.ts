// Seed script - uses direct better-sqlite3 for simplicity
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || path.join(rootDir, "data", "wired.db");

// Ensure data directory exists
import { mkdirSync } from "fs";
mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Simple ID generator (compatible with our wired core)
function createId(): string {
  return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 11);
}

async function seed() {
  console.log("Seeding demo data...");
  console.log(`Database: ${DB_PATH}`);

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      ai_provider TEXT DEFAULT 'openai',
      ai_base_url TEXT DEFAULT 'https://api.openai.com/v1',
      ai_model TEXT DEFAULT 'gpt-4o-mini',
      ai_api_key TEXT,
      github_token TEXT,
      default_sync_folder TEXT DEFAULT '.wired/notes',
      default_sync_mode TEXT DEFAULT 'write_only',
      theme TEXT DEFAULT 'system',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      source_type TEXT DEFAULT 'manual',
      local_path TEXT,
      remote_url TEXT,
      github_owner TEXT,
      github_repo TEXT,
      default_branch TEXT,
      current_branch TEXT,
      status TEXT DEFAULT 'active',
      tags TEXT DEFAULT '[]',
      accent_color TEXT,
      pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      last_scanned_at TEXT,
      last_ai_scanned_at TEXT,
      last_note_sync_at TEXT,
      last_summary_generated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS note (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body_markdown TEXT DEFAULT '',
      enhanced_body_markdown TEXT,
      note_type TEXT DEFAULT 'quick_note',
      tags TEXT DEFAULT '[]',
      status TEXT DEFAULT 'draft',
      pinned INTEGER DEFAULT 0,
      source TEXT DEFAULT 'web',
      sync_target_path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT,
      FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
    );
  `);
  console.log("Tables created/verified");

  // Create demo projects
  const projects = [
    {
      id: createId(),
      name: "wired",
      slug: "wired",
      description: "Self-hosted project intelligence and notes app",
      source_type: "local_folder",
      local_path: "/tmp/wired-demo",
      status: "active",
      tags: JSON.stringify(["typescript", "nextjs", "tauri", "ai"]),
      pinned: 1,
    },
    {
      id: createId(),
      name: "nomi-brief",
      slug: "nomi-brief",
      description: "Daily AI news aggregator with webhook integration",
      source_type: "local_folder",
      local_path: "/home/ryan/homelab/nomi-brief",
      status: "active",
      tags: JSON.stringify(["nextjs", "postgres", "ai", "rss"]),
      pinned: 0,
    },
  ];

  for (const p of projects) {
    const existing = db.prepare("SELECT id FROM project WHERE slug = ?").get(p.slug);
    if (!existing) {
      db.prepare(`
        INSERT INTO project (id, name, slug, description, source_type, local_path, status, tags, pinned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(p.id, p.name, p.slug, p.description, p.source_type, p.local_path, p.status, p.tags, p.pinned);
      console.log(`  Created project: ${p.name}`);
    } else {
      console.log(`  Project already exists: ${p.name}`);
    }
  }

  // Create demo notes
  const wiredProject = db.prepare("SELECT id FROM project WHERE slug = 'wired'").get() as { id: string } | undefined;
  if (wiredProject) {
    const notes = [
      {
        id: createId(),
        project_id: wiredProject.id,
        title: "Architecture decision: use Drizzle ORM",
        body_markdown: "## Decision\n\nUse **Drizzle ORM** for the database layer.\n\n### Pros\n- TypeScript-first\n- Lightweight, no CLI magic\n- SQLite works great for self-hosted\n- Easy migration path to Postgres\n\n### Cons\n- Smaller community than Prisma\n\n### Status\nAccepted",
        note_type: "decision",
        tags: JSON.stringify(["architecture", "database"]),
        status: "draft",
        pinned: 0,
      },
      {
        id: createId(),
        project_id: wiredProject.id,
        title: "TODO: implement file watcher for desktop",
        body_markdown: "## File Watcher\n\nNeed to implement desktop file watcher:\n- [ ] Choose watching library (chokidar?)\n- [ ] Debounce events (3-5 min)\n- [ ] Batch change events\n- [ ] Trigger local scan on meaningful changes\n- [ ] Respect per-project ignored paths\n\n## Priority\nHigh — needed for Phase 3 active work scans.",
        note_type: "task",
        tags: JSON.stringify(["desktop", "scanner"]),
        status: "draft",
        pinned: 1,
      },
    ];

    for (const n of notes) {
      const existing = db.prepare("SELECT id FROM note WHERE project_id = ? AND title = ?").get(n.project_id, n.title);
      if (!existing) {
        db.prepare(`
          INSERT INTO note (id, project_id, title, body_markdown, note_type, tags, status, pinned)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(n.id, n.project_id, n.title, n.body_markdown, n.note_type, n.tags, n.status, n.pinned);
        console.log(`  Created note: ${n.title.slice(0, 40)}…`);
      } else {
        console.log(`  Note already exists: ${n.title.slice(0, 40)}`);
      }
    }
  }

  // Verify
  const projectCount = (db.prepare("SELECT COUNT(*) as c FROM project").get() as { c: number }).c;
  const noteCount = (db.prepare("SELECT COUNT(*) as c FROM note").get() as { c: number }).c;
  console.log(`\nDatabase now has ${projectCount} projects and ${noteCount} notes`);
  console.log("Seed complete!");

  db.close();
}

seed().catch(console.error);
