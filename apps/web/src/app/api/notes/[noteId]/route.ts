import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params;
    const db = getDb();
    const note = db.prepare("SELECT * FROM note WHERE id = ?").get(noteId);

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("GET /api/notes/[noteId] error:", error);
    return NextResponse.json({ error: "Failed to fetch note" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params;
    const db = getDb();
    const body = await request.json();

    const existing = db.prepare("SELECT * FROM note WHERE id = ?").get(noteId);
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const allowed = [
      "title", "bodyMarkdown", "enhancedBodyMarkdown", "noteType",
      "tags", "status", "pinned", "syncTargetPath"
    ];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
      const camelKey = key as string;
      const snakeKey = camelKey.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (body[camelKey] !== undefined) {
        updates.push(`${snakeKey} = ?`);
        values.push(camelKey === "tags" ? JSON.stringify(body[camelKey]) : body[camelKey]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(noteId);

    db.prepare(`UPDATE note SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM note WHERE id = ?").get(noteId);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/notes/[noteId] error:", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params;
    const db = getDb();
    const existing = db.prepare("SELECT id FROM note WHERE id = ?").get(noteId);

    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM note WHERE id = ?").run(noteId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notes/[noteId] error:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
