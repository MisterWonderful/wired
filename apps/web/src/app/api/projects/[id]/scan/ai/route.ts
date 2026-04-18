import { NextRequest, NextResponse } from "next/server";
import { getDb, createId } from "@/lib/db";
import { getGitInfo } from "@wired/git";
import { scanDirectory, type FileScanCandidate } from "@wired/scanner";
import { readFileSync } from "fs";
import path from "path";

const SCAN_SYSTEM_PROMPT = `You are a senior software project intelligence analyst. Your job is to inspect a curated project context bundle and produce an accurate, practical project intelligence snapshot.

You must:
- Use only the supplied context.
- Never invent files, features, commits, or project facts.
- Clearly mark uncertainty.
- Estimate release readiness and completeness, but label both as estimates.
- Explain the evidence behind each estimate.
- Identify where the user likely left off.
- Identify what changed since the previous scan.
- Recommend next tasks that are practical and specific.
- Return valid JSON matching the requested schema.`;

const SCAN_USER_PROMPT = `Analyze this project and return a JSON object:

{
 "projectDescription": "string — what this project appears to do",
 "projectType": "string or null — e.g. Web App, CLI Tool, Library",
 "techStack": ["string — detected technologies"],
 "architectureSummary": "string — brief architectural description",
 "currentStateSummary": "string — what state the project is in right now",
 "whereLeftOff": "string — where the user likely left off based on recent changes, dirty files, and notes",
 "recentProgress": ["string — recently completed items"],
 "activeWorkAreas": ["string — areas of active development"],
 "releaseReadinessPercent": 0-100,
 "completenessPercent": 0-100,
 "confidencePercent": 0-100,
 "releaseReadinessExplanation": "string",
 "completenessExplanation": "string",
 "readinessScoreBreakdown": {
   "coreFunctionality": 0-100,
   "buildAndRunConfidence": 0-100,
   "testCoverage": 0-100,
   "documentation": 0-100,
   "errorHandling": 0-100,
   "securityBasics": 0-100,
   "deploymentReadiness": 0-100,
   "uiPolish": 0-100,
   "maintainability": 0-100
 },
 "blockers": [
   {"title": "string", "severity": "low|medium|high|critical", "explanation": "string", "evidence": ["string"], "suggestedFix": "string"}
 ],
 "risks": [
   {"title": "string", "riskLevel": "low|medium|high", "explanation": "string", "evidence": ["string"]}
 ],
 "suggestedNextTasks": [
   {"title": "string", "priority": "low|medium|high", "category": "code|test|docs|design|security|release|research", "explanation": "string", "relatedFiles": ["string"]}
 ],
 "openQuestions": ["string"],
 "detectedFeatures": [
   {"name": "string", "status": "planned|in_progress|mostly_complete|complete|unknown", "evidence": ["string"], "relatedFiles": ["string"]}
 ],
 "incompleteFeatures": [
   {"name": "string", "status": "planned|in_progress|mostly_complete|complete|unknown", "evidence": ["string"], "relatedFiles": ["string"]}
 ],
 "testingStatus": {
   "hasTests": boolean,
   "testFrameworks": ["string"],
   "lastKnownTestResult": "pass|fail|unknown",
   "coverageKnown": boolean,
   "summary": "string",
   "missingTestAreas": ["string"]
 },
 "documentationStatus": {
   "hasReadme": boolean,
   "hasDocsFolder": boolean,
   "summary": "string",
   "missingDocs": ["string"]
 }
}

Important:
- Percent values must be integers from 0 to 100.
- Confidence should be lower when project goals are unclear or context is thin.
- If you cannot determine intended scope, say that explicitly.
- Do not overrate release readiness just because code exists.
- Penalize missing tests, missing docs, broken build signals, unclear deployment, and unfinished TODOs.`;

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
      description: string | null;
      local_path: string | null;
      github_owner: string | null;
      github_repo: string | null;
    } | undefined;

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.local_path) {
      return NextResponse.json({ error: "Project has no local path — cannot run AI scan" }, { status: 400 });
    }

    // Gather context
    const gitInfo = await getGitInfo(project.local_path);
    const fileCandidates = scanDirectory(project.local_path, 100, 80_000);

    // Get recent notes
    const notes = db.prepare("SELECT title, body_markdown, note_type, updated_at FROM note WHERE project_id = ? ORDER BY updated_at DESC LIMIT 10")
      .all(id) as { title: string; body_markdown: string; note_type: string; updated_at: string }[];

    // Build context bundle
    const importantFiles = fileCandidates
      .filter((f) => f.isReadmeOrDoc || f.isConfig || f.isEntryPoint)
      .slice(0, 30);

    const fileContexts: string[] = [];
    for (const fc of importantFiles) {
      try {
        const content = readFileSync(`${project.local_path}/${fc.path}`, "utf-8").slice(0, 3000);
        fileContexts.push(`\n--- ${fc.path} ---\n${content}\n`);
      } catch {}
    }

    const contextBundle = `
Project: ${project.name}
Description: ${project.description || "None"}

Git State:
- Branch: ${gitInfo.branch || "N/A"}
- Dirty: ${gitInfo.isDirty ? `Yes (${gitInfo.dirtyFiles.length} files)` : "No"}
- Remote: ${gitInfo.remoteUrl || "None"}

Recent Commits (last ${gitInfo.recentCommits.length}):
${gitInfo.recentCommits.slice(0, 10).map((c) => `- ${c.hash} ${c.message} (${c.author})`).join("\n")}

Dirty Files: ${gitInfo.dirtyFiles.slice(0, 20).join(", ") || "None"}

Important Files: ${importantFiles.map((f) => f.path).join(", ")}

Recent Notes:
${notes.map((n) => `[${n.note_type}] ${n.title}\n${n.body_markdown.slice(0, 300)}`).join("\n\n")}

File Contents:
${fileContexts.join("\n")}
`.slice(0, 12000); // Limit context to ~12k chars

    // Check AI config
    const apiKey = process.env.AI_API_KEY;
    const aiBaseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
    const aiModel = process.env.AI_MODEL || "gpt-4o-mini";

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI not configured. Set AI_API_KEY to enable project intelligence scans." },
        { status: 400 },
      );
    }

    // Call AI
    const response = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: SCAN_SYSTEM_PROMPT },
          { role: "user", content: `${SCAN_USER_PROMPT}\n\n${contextBundle}` },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI scan error:", error);
      return NextResponse.json({ error: "AI scan failed", details: error }, { status: 502 });
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const raw = data.choices[0]?.message?.content || "{}";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI returned invalid response" }, { status: 502 });
    }

    let intelligence: Record<string, unknown>;
    try {
      intelligence = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }

    // Store snapshot
    const scanId = createId();
    const snapshotId = createId();
    const now = new Date().toISOString();

    // Store project_scan
    db.prepare(`
      INSERT INTO project_scan (id, project_id, scan_type, git_status_json, recent_commits_json, detected_files_json, todos_json, dirty_files_json, result_summary, created_at)
      VALUES (?, ?, 'ai', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      scanId,
      id,
      JSON.stringify({ branch: gitInfo.branch, isDirty: gitInfo.isDirty, dirtyFileCount: gitInfo.dirtyFiles.length }),
      JSON.stringify(gitInfo.recentCommits),
      JSON.stringify(fileCandidates.slice(0, 50).map((f) => ({ path: f.path, extension: f.extension }))),
      "[]",
      JSON.stringify(gitInfo.dirtyFiles),
      `AI scan: ${intelligence.projectDescription || "Complete"}`,
      now
    );

    // Store intelligence snapshot
    db.prepare(`
      INSERT INTO project_intelligence_snapshot (
        id, project_id, scan_id, project_description, project_type, tech_stack_json,
        architecture_summary, current_state_summary, where_left_off, recent_progress_json,
        active_work_areas_json, release_readiness_percent, completeness_percent, confidence_percent,
        release_readiness_explanation, completeness_explanation, readiness_score_breakdown_json,
        blockers_json, risks_json, suggested_next_tasks_json, open_questions_json,
        detected_features_json, incomplete_features_json, testing_status_json,
        documentation_status_json, git_summary_json, file_change_summary_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      snapshotId,
      id,
      scanId,
      intelligence.projectDescription || "",
      intelligence.projectType || null,
      JSON.stringify(intelligence.techStack || []),
      intelligence.architectureSummary || "",
      intelligence.currentStateSummary || "",
      intelligence.whereLeftOff || "",
      JSON.stringify(intelligence.recentProgress || []),
      JSON.stringify(intelligence.activeWorkAreas || []),
      intelligence.releaseReadinessPercent || 0,
      intelligence.completenessPercent || 0,
      intelligence.confidencePercent || 0,
      intelligence.releaseReadinessExplanation || "",
      intelligence.completenessExplanation || "",
      JSON.stringify(intelligence.readinessScoreBreakdown || {}),
      JSON.stringify(intelligence.blockers || []),
      JSON.stringify(intelligence.risks || []),
      JSON.stringify(intelligence.suggestedNextTasks || []),
      JSON.stringify(intelligence.openQuestions || []),
      JSON.stringify(intelligence.detectedFeatures || []),
      JSON.stringify(intelligence.incompleteFeatures || []),
      JSON.stringify(intelligence.testingStatus || {}),
      JSON.stringify(intelligence.documentationStatus || {}),
      JSON.stringify(gitInfo),
      JSON.stringify({ changedFiles: gitInfo.dirtyFiles, addedFiles: [], deletedFiles: [] }),
      now
    );

    // Update project's last_ai_scanned_at
    db.prepare("UPDATE project SET last_ai_scanned_at = ? WHERE id = ?").run(now, id);

    return NextResponse.json({
      scanId,
      snapshotId,
      projectId: id,
      scannedAt: now,
      intelligence,
    });
  } catch (error) {
    console.error("POST /api/projects/[id]/scan/ai error:", error);
    return NextResponse.json({ error: "AI scan failed" }, { status: 500 });
  }
}
