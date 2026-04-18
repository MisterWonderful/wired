import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY,
    ai_provider TEXT DEFAULT 'openai',
    ai_base_url TEXT DEFAULT 'https://api.openai.com/v1',
    ai_model TEXT DEFAULT 'gpt-4o-mini',
    ai_api_key TEXT DEFAULT '',
    github_token TEXT DEFAULT '',
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

  CREATE TABLE IF NOT EXISTS project_summary (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    summary_markdown TEXT DEFAULT '',
    tech_stack_json TEXT DEFAULT '[]',
    risks_json TEXT DEFAULT '[]',
    suggested_next_tasks_json TEXT DEFAULT '[]',
    source_snapshot_hash TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_scan (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    scan_type TEXT NOT NULL,
    git_status_json TEXT DEFAULT '{}',
    recent_commits_json TEXT DEFAULT '[]',
    detected_files_json TEXT DEFAULT '[]',
    todos_json TEXT DEFAULT '[]',
    dirty_files_json TEXT DEFAULT '[]',
    result_summary TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_scan_settings (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE,
    manual_scans_enabled INTEGER DEFAULT 1,
    timer_scans_enabled INTEGER DEFAULT 0,
    active_work_scans_enabled INTEGER DEFAULT 1,
    desktop_watcher_enabled INTEGER DEFAULT 0,
    timer_interval_minutes INTEGER,
    active_work_debounce_minutes INTEGER DEFAULT 5,
    ai_deep_scans_enabled INTEGER DEFAULT 1,
    ai_scan_on_major_change INTEGER DEFAULT 1,
    ai_scan_on_new_commit INTEGER DEFAULT 1,
    ai_scan_on_branch_change INTEGER DEFAULT 1,
    ai_scan_on_note_change INTEGER DEFAULT 1,
    max_ai_scan_frequency_minutes INTEGER DEFAULT 15,
    max_files_per_scan INTEGER DEFAULT 75,
    max_file_size_bytes INTEGER DEFAULT 100000,
    max_context_tokens INTEGER DEFAULT 120000,
    ignored_paths_json TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_intelligence_snapshot (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    scan_id TEXT,
    project_description TEXT DEFAULT '',
    project_type TEXT,
    tech_stack_json TEXT DEFAULT '[]',
    architecture_summary TEXT DEFAULT '',
    current_state_summary TEXT DEFAULT '',
    where_left_off TEXT DEFAULT '',
    recent_progress_json TEXT DEFAULT '[]',
    active_work_areas_json TEXT DEFAULT '[]',
    release_readiness_percent INTEGER DEFAULT 0,
    completeness_percent INTEGER DEFAULT 0,
    confidence_percent INTEGER DEFAULT 0,
    release_readiness_explanation TEXT DEFAULT '',
    completeness_explanation TEXT DEFAULT '',
    readiness_score_breakdown_json TEXT DEFAULT '{}',
    blockers_json TEXT DEFAULT '[]',
    risks_json TEXT DEFAULT '[]',
    suggested_next_tasks_json TEXT DEFAULT '[]',
    open_questions_json TEXT DEFAULT '[]',
    detected_features_json TEXT DEFAULT '[]',
    incomplete_features_json TEXT DEFAULT '[]',
    testing_status_json TEXT DEFAULT '{}',
    documentation_status_json TEXT DEFAULT '{}',
    git_summary_json TEXT DEFAULT '{}',
    file_change_summary_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
    FOREIGN KEY (scan_id) REFERENCES project_scan(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS project_file_snapshot (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    path TEXT NOT NULL,
    size_bytes INTEGER DEFAULT 0,
    hash TEXT,
    last_modified_at TEXT,
    relevance_score REAL DEFAULT 0,
    reason_codes_json TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS note_sync_state (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL UNIQUE,
    project_id TEXT NOT NULL,
    target_path TEXT NOT NULL,
    last_synced_hash TEXT,
    repo_file_hash TEXT,
    conflict_status TEXT DEFAULT 'none',
    sync_mode TEXT DEFAULT 'write_only',
    last_error TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (note_id) REFERENCES note(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_event (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    note_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT DEFAULT '',
    metadata_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );
`;

export function resolveDatabasePath(options?: {
  databaseUrl?: string | null;
  rootDir?: string;
}): string {
  const rootDir = options?.rootDir ? path.resolve(options.rootDir) : process.cwd();
  const rawUrl = options?.databaseUrl ?? process.env.DATABASE_URL ?? null;

  if (rawUrl) {
    return path.resolve(rawUrl.replace(/^file:/, "").replace(/^sqlite:/, ""));
  }

  return path.resolve(rootDir, "data", "wired.db");
}

export function ensureDatabase(databasePath: string): Database.Database {
  mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}
