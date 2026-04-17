import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function fetchGitHub(url: string, token: string) {
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");

    const settings = db.prepare("SELECT github_token FROM user_settings LIMIT 1").get() as any;
    const token = settings?.github_token;

    if (!token) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 401 });
    }

    if (!owner || !repo) {
      return NextResponse.json({ error: "owner and repo are required" }, { status: 400 });
    }

    const branches = await fetchGitHub(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      token
    ) as any[];

    return NextResponse.json(branches.map((b: any) => ({
      name: b.name,
      isDefault: b.name === "main" || b.name === "master",
    })));
  } catch (error: any) {
    console.error("GET /api/projects/[id]/branches error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch branches" }, { status: 500 });
  }
}
