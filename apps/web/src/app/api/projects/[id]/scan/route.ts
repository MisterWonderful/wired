import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ScanServiceError, runProjectScan } from "@/lib/project-scans";
import { isScanTriggerRequestAuthorized } from "@/lib/scan-trigger-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!isScanTriggerRequestAuthorized(request.headers)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const scanType = body?.type === "ai" ? "ai" : body?.type === "local" ? "local" : null;

    if (!scanType) {
      return NextResponse.json(
        { error: "type must be 'local' or 'ai'" },
        { status: 400 },
      );
    }

    const result = await runProjectScan(getDb(), id, scanType);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ScanServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("POST /api/projects/[id]/scan error:", error);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
