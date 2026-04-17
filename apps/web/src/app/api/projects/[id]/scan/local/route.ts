import { NextRequest, NextResponse } from "next/server";
import { getDb, createId } from "@/lib/db";
import { getGitInfo } from "@wired/git";
import { scanDirectory, type FileScanCandidate } from "@wired/scanner";
import { readFileSync } from "fs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const project = db.prepare("SELECT * FROM project WHERE id = ?").get(id) as {
      id: string;
      name: string;
      local_path: string | null;
      github_owner: string | null;
      github_repo: string | null;
    } | undefined;

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.local_path) {
      return NextResponse.json({ error: "Project has no local path — cannot scan" }, { status: 400 });
    }

    const scanId = createId();
    const now = new Date().toISOString();

    // Run git scan
    const gitInfo = await getGitInfo(project.local_path);

    // Run file scan
    let fileCandidates: FileScanCandidate[] = [];
    try {
      fileCandidates = scanDirectory(project.local_path, 150, 100_000);
    } catch (e) {
      console.error("File scan failed:", e);
    }

    // Extract TODO/FIXME from candidates
    const todos: { path: string; line: string }[] = [];
    for (const fc of fileCandidates.slice(0, 50)) {
      if (fc.containsTodo) {
        try {
          const content = readFileSync(`${project.local_path}/${fc.path}`, "utf-8").slice(0, 5000);
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (/\bTODO\b|\bFIXME\b|\bXXX\b/i.test(lines[i])) {
              todos.push({ path: fc.path, line: lines[i].trim().slice(0, 120) });
              if (todos.length >= 20) break;
            }
          }
        } catch {}
        if (todos.length >= 20) break;
      }
    }

    // Store scan record
    db.prepare(`
      INSERT INTO project_scan (id, project_id, scan_type, git_status_json, recent_commits_json, detected_files_json, todos_json, dirty_files_json, result_summary, created_at)
      VALUES (?, ?, 'local', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      scanId,
      id,
      JSON.stringify({
        branch: gitInfo.branch,
        defaultBranch: gitInfo.defaultBranch,
        isDirty: gitInfo.isDirty,
        dirtyFileCount: gitInfo.dirtyFiles.length,
        dirtyFiles: gitInfo.dirtyFiles,
        remoteUrl: gitInfo.remoteUrl,
      }),
      JSON.stringify(gitInfo.recentCommits),
      JSON.stringify(fileCandidates.map((f) => ({ path: f.path, extension: f.extension, sizeBytes: f.sizeBytes }))),
      JSON.stringify(todos),
      JSON.stringify(gitInfo.dirtyFiles),
      `Local scan: ${gitInfo.isDirty ? `${gitInfo.dirtyFiles.length} dirty files` : "clean"}, ${gitInfo.recentCommits.length} recent commits`,
      now
    );

    // Update project's last_scanned_at
    db.prepare("UPDATE project SET last_scanned_at = ? WHERE id = ?").run(now, id);

    return NextResponse.json({
      scanId,
      projectId: id,
      scannedAt: now,
      git: {
        branch: gitInfo.branch,
        isDirty: gitInfo.isDirty,
        dirtyFileCount: gitInfo.dirtyFiles.length,
        dirtyFiles: gitInfo.dirtyFiles.slice(0, 10),
        recentCommits: gitInfo.recentCommits.slice(0, 10),
        remoteUrl: gitInfo.remoteUrl,
      },
      files: {
        totalScanned: fileCandidates.length,
        topFiles: fileCandidates.slice(0, 20).map((f) => ({
          path: f.path,
          extension: f.extension,
          sizeBytes: f.sizeBytes,
        })),
      },
      todos: todos.slice(0, 20),
    });
  } catch (error) {
    console.error("POST /api/projects/[id]/scan/local error:", error);
    return NextResponse.json({ error: "Local scan failed" }, { status: 500 });
  }
}
