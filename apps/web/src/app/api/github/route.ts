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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    const db = getDb();
    const settings = db.prepare("SELECT github_token FROM user_settings LIMIT 1").get() as any;
    const token = settings?.github_token;

    if (!token) {
      return NextResponse.json({ error: "GitHub token not configured. Add it in Settings." }, { status: 401 });
    }

    if (query) {
      // Search repos
      const data = await fetchGitHub(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+is:public`,
        token
      ) as { items: any[]; total_count: number };

      const repos = (data.items || []).slice(0, 20).map((r: any) => ({
        full_name: r.full_name,
        name: r.name,
        description: r.description,
        stargazers_count: r.stargazers_count,
        default_branch: r.default_branch,
        html_url: r.html_url,
        topics: r.topics || [],
        language: r.language,
        updated_at: r.updated_at,
      }));

      return NextResponse.json(repos);
    }

    // List user's repos (paginated)
    const data = await fetchGitHub(
      "https://api.github.com/user/repos?sort=pushed&per_page=30",
      token
    ) as any[];

    const repos = (data || []).map((r: any) => ({
      full_name: r.full_name,
      name: r.name,
      description: r.description,
      stargazers_count: r.stargazers_count,
      default_branch: r.default_branch,
      html_url: r.html_url,
      topics: r.topics || [],
      language: r.language,
      updated_at: r.pushed_at,
    }));

    return NextResponse.json(repos);
  } catch (error: any) {
    console.error("GET /api/github error:", error);
    return NextResponse.json({ error: error.message || "GitHub request failed" }, { status: 500 });
  }
}
