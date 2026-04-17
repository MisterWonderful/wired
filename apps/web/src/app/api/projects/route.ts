import { NextRequest, NextResponse } from "next/server";
import { getDb, slugify, createId } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");

    let query = "SELECT * FROM project WHERE 1=1";
    const params: unknown[] = [];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    if (search) {
      query += " AND (name LIKE ? OR description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (tag) {
      query += " AND tags LIKE ?";
      params.push(`%"${tag}"%`);
    }

    query += " ORDER BY pinned DESC, updated_at DESC";

    const projects = db.prepare(query).all(...params);
    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { name, description, sourceType, localPath, remoteUrl, githubOwner, githubRepo, tags, accentColor } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const id = createId();
    const slug = slugify(name);
    const now = new Date().toISOString();

    // Check slug uniqueness
    const existing = db.prepare("SELECT id FROM project WHERE slug = ?").get(slug);
    const finalSlug = existing ? `${slug}-${id.slice(0, 4)}` : slug;

    db.prepare(`
      INSERT INTO project (id, name, slug, description, source_type, local_path, remote_url, github_owner, github_repo, status, tags, accent_color, pinned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 0, ?, ?)
    `).run(
      id,
      name,
      finalSlug,
      description || null,
      sourceType || "manual",
      localPath || null,
      remoteUrl || null,
      githubOwner || null,
      githubRepo || null,
      JSON.stringify(tags || []),
      accentColor || null,
      now,
      now
    );

    const project = db.prepare("SELECT * FROM project WHERE id = ?").get(id);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
