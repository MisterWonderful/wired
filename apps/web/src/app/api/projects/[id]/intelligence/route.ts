import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const snapshots = db.prepare(`
      SELECT id, project_id, scan_id, project_description, project_type,
             tech_stack_json, architecture_summary, current_state_summary,
             where_left_off, recent_progress_json, active_work_areas_json,
             release_readiness_percent, completeness_percent, confidence_percent,
             release_readiness_explanation, completeness_explanation,
             readiness_score_breakdown_json, blockers_json, risks_json,
             suggested_next_tasks_json, open_questions_json,
             detected_features_json, incomplete_features_json,
             testing_status_json, documentation_status_json,
             git_summary_json, file_change_summary_json, created_at
      FROM project_intelligence_snapshot
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(id, limit);

    return NextResponse.json(snapshots);
  } catch (error) {
    console.error("GET /api/projects/[id]/intelligence error:", error);
    return NextResponse.json({ error: "Failed to fetch intelligence" }, { status: 500 });
  }
}
