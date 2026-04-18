import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildSettingsPatch, serializePublicSettings } from "@/lib/settings";

export async function GET() {
  try {
    const db = getDb();
    const settings = db.prepare("SELECT * FROM user_settings LIMIT 1").get() as Record<string, unknown> | undefined;

    return NextResponse.json(serializePublicSettings(settings));
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json() as Record<string, unknown>;
    const patch = buildSettingsPatch(body);

    const updates: string[] = ["updated_at = ?"];
    const values: unknown[] = [new Date().toISOString()];

    for (const [key, value] of Object.entries(patch.publicFields)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (patch.aiApiKey !== undefined) {
      updates.push("ai_api_key = ?");
      values.push(patch.aiApiKey);
    }
    if (patch.githubToken !== undefined) {
      updates.push("github_token = ?");
      values.push(patch.githubToken);
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
        patch.publicFields.ai_provider || "openai",
        patch.publicFields.ai_base_url || "https://api.openai.com/v1",
        patch.publicFields.ai_model || "gpt-4o-mini",
        patch.aiApiKey ?? null,
        patch.githubToken ?? null,
        patch.publicFields.default_sync_folder || ".wired/notes",
        patch.publicFields.default_sync_mode || "write_only",
        patch.publicFields.theme || "system",
        new Date().toISOString(),
        new Date().toISOString()
      );
    }

    const settings = db.prepare("SELECT * FROM user_settings LIMIT 1").get() as Record<string, unknown> | undefined;
    return NextResponse.json(serializePublicSettings(settings));
  } catch (error) {
    console.error("PATCH /api/settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
