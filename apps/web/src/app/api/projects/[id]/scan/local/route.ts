import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ScanServiceError, runProjectScan } from "@/lib/project-scans";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await runProjectScan(getDb(), id, "local");
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ScanServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("POST /api/projects/[id]/scan/local error:", error);
    return NextResponse.json({ error: "Local scan failed" }, { status: 500 });
  }
}
