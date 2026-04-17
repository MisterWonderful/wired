import { NextRequest, NextResponse } from "next/server";
import { getDb, createId } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = "SELECT * FROM note WHERE project_id = ?";
    const params_list: unknown[] = [id];

    if (type) {
      query += " AND note_type = ?";
      params_list.push(type);
    }
    if (status) {
      query += " AND status = ?";
      params_list.push(status);
    }
    if (search) {
      query += " AND (title LIKE ? OR body_markdown LIKE ?)";
      params_list.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY pinned DESC, updated_at DESC";

    const notes = db.prepare(query).all(...params_list);
    return NextResponse.json(notes);
  } catch (error) {
    console.error("GET /api/projects/[id]/notes error:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const db = getDb();
    const body = await request.json();
    const { title, bodyMarkdown, noteType, tags, source } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const id = createId();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO note (id, project_id, title, body_markdown, note_type, tags, status, pinned, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', 0, ?, ?, ?)
    `).run(
      id,
      projectId,
      title,
      bodyMarkdown || "",
      noteType || "quick_note",
      JSON.stringify(tags || []),
      source || "web",
      now,
      now
    );

    // Update project's updated_at
    db.prepare("UPDATE project SET updated_at = ? WHERE id = ?").run(now, projectId);

    const note = db.prepare("SELECT * FROM note WHERE id = ?").get(id);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/notes error:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
