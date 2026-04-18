import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── User Settings ─────────────────────────────────────────────────────────────

export const userSettings = sqliteTable("user_settings", {
  id: text("id").primaryKey(),
  aiProvider: text("ai_provider").default("openai"),
  aiBaseUrl: text("ai_base_url").default("https://api.openai.com/v1"),
  aiModel: text("ai_model").default("gpt-4o-mini"),
  aiApiKey: text("ai_api_key").default(""),
  githubToken: text("github_token").default(""),
  defaultSyncFolder: text("default_sync_folder").default(".wired/notes"),
  defaultSyncMode: text("default_sync_mode").default("write_only"),
  theme: text("theme").default("system"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ─── Project ────────────────────────────────────────────────────────────────────

export const projects = sqliteTable("project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sourceType: text("source_type").notNull(), // local_folder | github | git_remote | manual
  localPath: text("local_path"),
  remoteUrl: text("remote_url"),
  githubOwner: text("github_owner"),
  githubRepo: text("github_repo"),
  defaultBranch: text("default_branch"),
  currentBranch: text("current_branch"),
  status: text("status").default("active"), // active | paused | archived
  tags: text("tags").default("[]"), // JSON array
  accentColor: text("accent_color"),
  pinned: integer("pinned").default(0), // 0 | 1
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  lastScannedAt: text("last_scanned_at"),
  lastAiScannedAt: text("last_ai_scanned_at"),
  lastNoteSyncAt: text("last_note_sync_at"),
  lastSummaryGeneratedAt: text("last_summary_generated_at"),
});

// ─── Note ───────────────────────────────────────────────────────────────────────

export const notes = sqliteTable("note", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  bodyMarkdown: text("body_markdown").default(""),
  enhancedBodyMarkdown: text("enhanced_body_markdown"),
  noteType: text("note_type").default("quick_note"),
  tags: text("tags").default("[]"), // JSON array
  status: text("status").default("draft"), // draft | enhanced | approved | synced | archived
  pinned: integer("pinned").default(0),
  source: text("source").default("web"), // web | desktop | mobile | import
  syncTargetPath: text("sync_target_path"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  syncedAt: text("synced_at"),
});

// ─── Project Summary ───────────────────────────────────────────────────────────

export const projectSummaries = sqliteTable("project_summary", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  summaryMarkdown: text("summary_markdown").default(""),
  techStackJson: text("tech_stack_json").default("[]"),
  risksJson: text("risks_json").default("[]"),
  suggestedNextTasksJson: text("suggested_next_tasks_json").default("[]"),
  sourceSnapshotHash: text("source_snapshot_hash"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ─── Project Scan ───────────────────────────────────────────────────────────────

export const projectScans = sqliteTable("project_scan", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  scanType: text("scan_type").notNull(), // local | ai_deep
  gitStatusJson: text("git_status_json").default("{}"),
  recentCommitsJson: text("recent_commits_json").default("[]"),
  detectedFilesJson: text("detected_files_json").default("[]"),
  todosJson: text("todos_json").default("[]"),
  dirtyFilesJson: text("dirty_files_json").default("[]"),
  resultSummary: text("result_summary").default(""),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ─── Project Scan Settings ─────────────────────────────────────────────────────

export const projectScanSettings = sqliteTable("project_scan_settings", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().unique().references(() => projects.id, { onDelete: "cascade" }),
  manualScansEnabled: integer("manual_scans_enabled").default(1),
  timerScansEnabled: integer("timer_scans_enabled").default(0),
  activeWorkScansEnabled: integer("active_work_scans_enabled").default(1),
  desktopWatcherEnabled: integer("desktop_watcher_enabled").default(0),
  timerIntervalMinutes: integer("timer_interval_minutes"),
  activeWorkDebounceMinutes: integer("active_work_debounce_minutes").default(5),
  aiDeepScansEnabled: integer("ai_deep_scans_enabled").default(1),
  aiScanOnMajorChange: integer("ai_scan_on_major_change").default(1),
  aiScanOnNewCommit: integer("ai_scan_on_new_commit").default(1),
  aiScanOnBranchChange: integer("ai_scan_on_branch_change").default(1),
  aiScanOnNoteChange: integer("ai_scan_on_note_change").default(1),
  maxAiScanFrequencyMinutes: integer("max_ai_scan_frequency_minutes").default(15),
  maxFilesPerScan: integer("max_files_per_scan").default(75),
  maxFileSizeBytes: integer("max_file_size_bytes").default(100000),
  maxContextTokens: integer("max_context_tokens").default(120000),
  ignoredPathsJson: text("ignored_paths_json").default("[]"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ─── Project Intelligence Snapshot ────────────────────────────────────────────

export const projectIntelligenceSnapshots = sqliteTable("project_intelligence_snapshot", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  scanId: text("scan_id").references(() => projectScans.id, { onDelete: "set null" }),
  projectDescription: text("project_description").default(""),
  projectType: text("project_type"),
  techStackJson: text("tech_stack_json").default("[]"),
  architectureSummary: text("architecture_summary").default(""),
  currentStateSummary: text("current_state_summary").default(""),
  whereLeftOff: text("where_left_off").default(""),
  recentProgressJson: text("recent_progress_json").default("[]"),
  activeWorkAreasJson: text("active_work_areas_json").default("[]"),
  releaseReadinessPercent: integer("release_readiness_percent").default(0),
  completenessPercent: integer("completeness_percent").default(0),
  confidencePercent: integer("confidence_percent").default(0),
  releaseReadinessExplanation: text("release_readiness_explanation").default(""),
  completenessExplanation: text("completeness_explanation").default(""),
  readinessScoreBreakdownJson: text("readiness_score_breakdown_json").default("{}"),
  blockersJson: text("blockers_json").default("[]"),
  risksJson: text("risks_json").default("[]"),
  suggestedNextTasksJson: text("suggested_next_tasks_json").default("[]"),
  openQuestionsJson: text("open_questions_json").default("[]"),
  detectedFeaturesJson: text("detected_features_json").default("[]"),
  incompleteFeaturesJson: text("incomplete_features_json").default("[]"),
  testingStatusJson: text("testing_status_json").default("{}"),
  documentationStatusJson: text("documentation_status_json").default("{}"),
  gitSummaryJson: text("git_summary_json").default("{}"),
  fileChangeSummaryJson: text("file_change_summary_json").default("{}"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ─── Project File Snapshot ─────────────────────────────────────────────────────

export const projectFileSnapshots = sqliteTable("project_file_snapshot", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  sizeBytes: integer("size_bytes").default(0),
  hash: text("hash"),
  lastModifiedAt: text("last_modified_at"),
  relevanceScore: real("relevance_score").default(0),
  reasonCodesJson: text("reason_codes_json").default("[]"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ─── Note Sync State ────────────────────────────────────────────────────────────

export const noteSyncStates = sqliteTable("note_sync_state", {
  id: text("id").primaryKey(),
  noteId: text("note_id").notNull().unique().references(() => notes.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  targetPath: text("target_path").notNull(),
  lastSyncedHash: text("last_synced_hash"),
  repoFileHash: text("repo_file_hash"),
  conflictStatus: text("conflict_status").default("none"), // none | conflict_detected | resolved
  syncMode: text("sync_mode").default("write_only"),
  lastError: text("last_error"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ─── Activity Event ─────────────────────────────────────────────────────────────

export const activityEvents = sqliteTable("activity_event", {
  id: text("id").primaryKey(),
  projectId: text("project_id"),
  noteId: text("note_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").default(""),
  metadataJson: text("metadata_json").default("{}"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export { ensureDatabase, resolveDatabasePath } from "./bootstrap";
