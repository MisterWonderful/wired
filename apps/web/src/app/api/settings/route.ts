import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const settings = db.prepare("SELECT * FROM user_settings LIMIT 1").get();

    if (!settings) {
      // Return defaults
      return NextResponse.json({
        id: null,
        ai_provider: "openai",
        ai_base_url: "https://api.openai.com/v1",
        ai_model: "gpt-4o-mini",
        ai_api_key: null,
        github_token: null,
        default_sync_folder: ".wired/notes",
        default_sync_mode: "write_only",
        theme: "system",
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    const allowed = [
      "ai_provider", "ai_base_url", "ai_model",
      "default_sync_folder", "default_sync_mode", "theme"
    ];

    const updates: string[] = ["updated_at = ?"];
    const values: unknown[] = [new Date().toISOString()];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(body[key]);
      }
    }

    // Handle API keys specially (never returned in GET)
    if (body.ai_api_key !== undefined) {
      updates.push("ai_api_key = ?");
      values.push(body.ai_api_key || null);
    }
    if (body.github_token !== undefined) {
      updates.push("github_token = ?");
      values.push(body.github_token || null);
    }

    const existing = db.prepare("SELECT id FROM user_settings LIMIT 1").get() as { id: string } | undefined;

    if (existing) {
      db.prepare(`UPDATE user_settings SET ${updates.join(", ")} WHERE id = ?`).run(...values, existing.id);
    } else {
      const id = Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 11);
      db.prepare(`
        INSERT INTO user_settings (id, ai_provider, ai_base_url, ai_model, ai_api_key, github_token, default_sync_folder, default_sync_mode, theme, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.ai_provider || "openai",
        body.ai_base_url || "https://api.openai.com/v1",
        body.ai_model || "gpt-4o-mini",
        body.ai_api_key || null,
        body.github_token || null,
        body.default_sync_folder || ".wired/notes",
        body.default_sync_mode || "write_only",
        body.theme || "system",
        new Date().toISOString(),
        new Date().toISOString()
      );
    }

    const settings = db.prepare("SELECT * FROM user_settings LIMIT 1").get();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("PATCH /api/settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
