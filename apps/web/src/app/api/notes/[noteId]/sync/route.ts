import { NextRequest, NextResponse } from "next/server";
import { getDb, createId } from "@/lib/db";
import { buildNoteFrontmatter, buildNoteFileName, computeHash, detectConflict } from "@wired/sync";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest, { params }: { params: Promise<{ noteId: string }> }) {
  try {
    const { noteId } = await params;
    const db = getDb();

    // Get note
    const note = db.prepare("SELECT * FROM note WHERE id = ?").get(noteId) as any;
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Get project
    const project = db.prepare("SELECT * FROM project WHERE id = ?").get(note.project_id) as any;
    if (!project || !project.local_path) {
      return NextResponse.json({ error: "Project has no local path" }, { status: 400 });
    }

    // Get settings for sync folder
    const settings = db.prepare("SELECT default_sync_folder, default_sync_mode FROM user_settings LIMIT 1").get() as any;
    const syncFolder = settings?.default_sync_folder || ".wired/notes";
    const syncMode = settings?.default_sync_mode || "write_only";

    const targetDir = join(project.local_path, syncFolder);
    const fileName = buildNoteFileName(note);
    const targetPath = join(targetDir, fileName);

    // Ensure directory exists
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // Build content
    const bodyContent = note.body_markdown || "";
    const frontmatter = buildNoteFrontmatter({
      ...note,
      syncedAt: new Date().toISOString(),
    });
    const fullContent = frontmatter + bodyContent;
    const contentHash = computeHash(fullContent);

    // Check for conflicts
    let repoHash: string | null = null;
    let conflictStatus = "none";
    if (existsSync(targetPath)) {
      try {
        const existingContent = readFileSync(targetPath, "utf-8");
        repoHash = computeHash(existingContent);
        const syncState = db.prepare("SELECT repo_file_hash FROM note_sync_state WHERE note_id = ?").get(noteId) as any;
        const previousRepoHash = syncState?.repo_file_hash;
        conflictStatus = detectConflict(contentHash, previousRepoHash, repoHash) ? "conflict_detected" : "none";
      } catch {}
    }

    // Write file
    writeFileSync(targetPath, fullContent, "utf-8");

    // Update note
    const now = new Date().toISOString();
    db.prepare("UPDATE note SET synced_at = ?, updated_at = ? WHERE id = ?").run(now, now, noteId);

    // Upsert sync state
    const existingState = db.prepare("SELECT id FROM note_sync_state WHERE note_id = ?").get(noteId);
    if (existingState) {
      db.prepare(`
        UPDATE note_sync_state
        SET target_path = ?, last_synced_hash = ?, repo_file_hash = ?, conflict_status = ?, sync_mode = ?, updated_at = ?
        WHERE note_id = ?
      `).run(targetPath, contentHash, repoHash, conflictStatus, syncMode, now, noteId);
    } else {
      const id = createId();
      db.prepare(`
        INSERT INTO note_sync_state (id, note_id, project_id, target_path, last_synced_hash, repo_file_hash, conflict_status, sync_mode, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, noteId, project.id, targetPath, contentHash, repoHash, conflictStatus, syncMode, now);
    }

    return NextResponse.json({
      success: true,
      path: targetPath,
      hash: contentHash,
      conflict: conflictStatus === "conflict_detected",
      syncedAt: now,
    });
  } catch (error: any) {
    console.error("POST /api/notes/[noteId]/sync error:", error);
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 });
  }
}
