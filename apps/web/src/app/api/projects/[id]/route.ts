import { NextRequest, NextResponse } from "next/server";
import { getDb, slugify } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const project = db.prepare("SELECT * FROM project WHERE id = ?").get(id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();

    const existing = db.prepare("SELECT * FROM project WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const allowed = [
      "name", "description", "sourceType", "localPath", "remoteUrl",
      "githubOwner", "githubRepo", "defaultBranch", "currentBranch",
      "status", "tags", "accentColor", "pinned"
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
    values.push(id);

    db.prepare(`UPDATE project SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM project WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const existing = db.prepare("SELECT id FROM project WHERE id = ?").get(id);

    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM project WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
