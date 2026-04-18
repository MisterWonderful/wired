export type SyncMode = "write_only" | "write_stage" | "write_stage_commit";
export type ConflictStatus = "none" | "conflict_detected" | "resolved";

export interface SyncResult {
  success: boolean;
  path?: string;
  hash?: string;
  conflict?: boolean;
  error?: string;
}

export function buildNoteFrontmatter(note: {
  id: string;
  projectId?: string;
  project_id?: string;
  title: string;
  noteType?: string;
  note_type?: string;
  tags: string[];
  status: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  syncedAt?: string | null;
  synced_at?: string | null;
}): string {
  const date = new Date().toISOString();
  const projectId = note.projectId ?? note.project_id ?? "";
  const noteType = note.noteType ?? note.note_type ?? "quick_note";
  const createdAt = note.createdAt ?? note.created_at ?? date;
  const updatedAt = note.updatedAt ?? note.updated_at ?? createdAt;
  const syncedAt = note.syncedAt ?? note.synced_at ?? date;
  const safeTitle = note.title.replace(/"/g, '\\"').replace(/\n/g, "\\n");
  const tagList = note.tags.map(t => '"' + t + '"').join(", ");
  return "---\nwired_note_id: \"" + note.id + "\"\nproject_id: \"" + projectId + "\"\ntitle: \"" + safeTitle + "\"\ntype: \"" + noteType + "\"\ntags: [" + tagList + "]\nstatus: \"" + note.status + "\"\ncreated_at: \"" + createdAt + "\"\nupdated_at: \"" + updatedAt + "\"\nsynced_at: \"" + syncedAt + "\"\nsource: \"Wired\"\n---\n\n";
}

export function buildNoteFileName(note: { title: string; createdAt?: string; created_at?: string }): string {
  const createdAt = note.createdAt ?? note.created_at ?? new Date().toISOString();
  const date = new Date(createdAt).toISOString().slice(0, 10);
  const slug = note.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return date + "-" + slug + ".md";
}

export function computeHash(content: string): string {
  // Simple hash using JSON parse + string conversion for cross-platform
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).slice(0, 16);
}

export function detectConflict(
  appHash: string,
  previousRepoHash: string | null,
  currentRepoHash: string | null
): boolean {
  if (!previousRepoHash) return false;
  if (!currentRepoHash) return false;
  return previousRepoHash !== currentRepoHash && currentRepoHash !== appHash;
}

export function resolveConflict(
  appContent: string,
  repoContent: string,
  mode: "keep_app" | "keep_repo" | "merge" | "duplicate"
): { content: string; path: string } {
  if (mode === "keep_repo" || mode === "duplicate") {
    return { content: repoContent, path: mode === "keep_repo" ? "repo_version.md" : "conflict_copy.md" };
  }
  if (mode === "merge") {
    return { content: "<!-- Wired: merged conflict -->\n" + repoContent, path: "merged.md" };
  }
  return { content: appContent, path: "app_version.md" };
}

export const DEFAULT_SYNC_FOLDER = ".wired/notes";
