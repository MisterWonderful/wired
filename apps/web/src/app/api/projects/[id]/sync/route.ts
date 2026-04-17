import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    // Get project to find sync folder
    const project = db.prepare("SELECT * FROM project WHERE id = ?").get(id) as any;
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get all note sync states for this project
    const states = db.prepare(`
      SELECT ns.*, n.title, n.body_markdown
      FROM note_sync_state ns
      JOIN note n ON n.id = ns.note_id
      WHERE ns.project_id = ?
      ORDER BY ns.updated_at DESC
    `).all(id);

    const result = states.map((s: any) => ({
      noteId: s.note_id,
      title: s.title,
      status: s.conflict_status === "conflict_detected" ? "conflict"
        : s.sync_mode === "write_only" && s.last_synced_hash ? "synced"
        : "pending",
      lastSyncedAt: s.updated_at,
      targetPath: s.target_path,
      repoHash: s.repo_file_hash,
      appHash: s.last_synced_hash,
      error: s.last_error,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/projects/[id]/sync error:", error);
    return NextResponse.json({ error: "Failed to fetch sync states" }, { status: 500 });
  }
}
