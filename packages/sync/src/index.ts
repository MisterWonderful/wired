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
  projectId: string;
  title: string;
  noteType: string;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}): string {
  const date = new Date().toISOString();
  const safeTitle = note.title.replace(/"/g, '\\"').replace(/\n/g, "\\n");
  const tagList = note.tags.map(t => '"' + t + '"').join(", ");
  return "---\nwired_note_id: \"" + note.id + "\"\nproject_id: \"" + note.projectId + "\"\ntitle: \"" + safeTitle + "\"\ntype: \"" + note.noteType + "\"\ntags: [" + tagList + "]\nstatus: \"" + note.status + "\"\ncreated_at: \"" + note.createdAt + "\"\nupdated_at: \"" + note.updatedAt + "\"\nsynced_at: \"" + (note.syncedAt || date) + "\"\nsource: \"Wired\"\n---\n\n";
}

export function buildNoteFileName(note: { title: string; createdAt: string }): string {
  const date = new Date(note.createdAt).toISOString().slice(0, 10);
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
  _appHash: string,
  previousRepoHash: string | null,
  currentRepoHash: string | null
): boolean {
  if (!previousRepoHash) return false;
  return previousRepoHash !== currentRepoHash;
}

export function resolveConflict(
  _appContent: string,
  repoContent: string,
  mode: "keep_app" | "keep_repo" | "merge" | "duplicate"
): { content: string; path: string } {
  if (mode === "keep_repo" || mode === "duplicate") {
    return { content: repoContent, path: mode === "keep_repo" ? "repo_version.md" : "conflict_copy.md" };
  }
  if (mode === "merge") {
    return { content: "<!-- Wired: merged conflict -->\n" + repoContent, path: "merged.md" };
  }
  return { content: repoContent, path: "app_version.md" };
}

export const DEFAULT_SYNC_FOLDER = ".wired/notes";