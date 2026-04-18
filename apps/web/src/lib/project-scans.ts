import { readFileSync } from "node:fs";
import type Database from "better-sqlite3";
import {
  createAIResponse,
} from "@wired/ai";
import {
  buildContextBundle,
  rankFiles,
  scanDirectory,
  type FileScanCandidate,
} from "@wired/scanner";
import type { ScanTriggerResult, ScanType, TriggeredScanGitSummary } from "@wired/core";
import { getGitInfo } from "@wired/git";
import { createId } from "@/lib/db";

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

interface ScanProject {
  id: string;
  name: string;
  description: string | null;
  local_path: string | null;
  github_owner: string | null;
  github_repo: string | null;
}

interface ScanNote {
  title: string;
  body_markdown: string;
  note_type: string;
  updated_at: string;
}

interface StoredScanSettings {
  ai_provider: string | null;
  ai_base_url: string | null;
  ai_model: string | null;
  ai_api_key: string | null;
}

export class ScanServiceError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export async function runProjectScan(
  db: Database.Database,
  projectId: string,
  scanType: ScanType,
): Promise<ScanTriggerResult> {
  const project = db.prepare("SELECT * FROM project WHERE id = ?").get(projectId) as ScanProject | undefined;
  if (!project) {
    throw new ScanServiceError("Project not found", 404);
  }

  if (!project.local_path) {
    throw new ScanServiceError("Project has no local path — cannot scan", 400);
  }

  if (scanType === "local") {
    return runLocalProjectScan(db, project);
  }

  return runAiProjectScan(db, project);
}

export function resolveAiRuntimeConfig(
  settings?: Partial<StoredScanSettings> | null,
  env: NodeJS.ProcessEnv = process.env,
) {
  const apiKey = firstNonEmpty(settings?.ai_api_key, env.AI_API_KEY);
  if (!apiKey) {
    return null;
  }

  return {
    provider: firstNonEmpty(settings?.ai_provider, env.AI_PROVIDER, "openai")!,
    baseUrl: firstNonEmpty(settings?.ai_base_url, env.AI_BASE_URL, "https://api.openai.com/v1")!,
    model: firstNonEmpty(settings?.ai_model, env.AI_MODEL, "gpt-4o-mini")!,
    apiKey,
  };
}

export function extractJsonObject(raw: string): Record<string, unknown> {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new ScanServiceError("AI returned invalid response", 502);
  }

  try {
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    throw new ScanServiceError("Failed to parse AI response", 502);
  }
}

async function runLocalProjectScan(
  db: Database.Database,
  project: ScanProject,
): Promise<ScanTriggerResult> {
  const gitInfo = await getGitInfo(project.local_path!);
  const fileCandidates = scanDirectory(project.local_path!, 150, 100_000);
  const rankedFiles = rankFiles(fileCandidates);
  const todos = collectTodos(fileCandidates);

  const scanId = createId();
  const now = new Date().toISOString();
  const summary = `Local scan: ${gitInfo.isDirty ? `${gitInfo.dirtyFiles.length} dirty files` : "clean"}, ${gitInfo.recentCommits.length} recent commits`;

  db.prepare(`
    INSERT INTO project_scan (id, project_id, scan_type, git_status_json, recent_commits_json, detected_files_json, todos_json, dirty_files_json, result_summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    scanId,
    project.id,
    "local",
    JSON.stringify({
      branch: gitInfo.branch,
      defaultBranch: gitInfo.defaultBranch,
      isDirty: gitInfo.isDirty,
      dirtyFileCount: gitInfo.dirtyFiles.length,
      dirtyFiles: gitInfo.dirtyFiles,
      remoteUrl: gitInfo.remoteUrl,
    }),
    JSON.stringify(gitInfo.recentCommits),
    JSON.stringify(
      rankedFiles.slice(0, 50).map((file) => ({
        path: file.path,
        extension: file.extension,
        sizeBytes: file.sizeBytes,
        relevanceScore: file.relevanceScore,
      })),
    ),
    JSON.stringify(todos),
    JSON.stringify(gitInfo.dirtyFiles),
    summary,
    now,
  );

  db.prepare("UPDATE project SET last_scanned_at = ?, updated_at = ? WHERE id = ?").run(now, now, project.id);

  return {
    scanId,
    projectId: project.id,
    scanType: "local",
    scannedAt: now,
    summary,
    git: buildGitSummary(gitInfo),
    files: {
      totalScanned: fileCandidates.length,
      topFiles: rankedFiles.slice(0, 20).map((file) => ({
        path: file.path,
        extension: file.extension,
        sizeBytes: file.sizeBytes,
        relevanceScore: file.relevanceScore,
      })),
    },
    todos,
    persistence: {
      projectScanStored: true,
      intelligenceSnapshotStored: false,
      websiteReady: true,
    },
  };
}

async function runAiProjectScan(
  db: Database.Database,
  project: ScanProject,
): Promise<ScanTriggerResult> {
  const gitInfo = await getGitInfo(project.local_path!);
  const fileCandidates = scanDirectory(project.local_path!, 100, 80_000);
  const rankedFiles = rankFiles(fileCandidates);
  const notes = db.prepare(
    "SELECT title, body_markdown, note_type, updated_at FROM note WHERE project_id = ? ORDER BY updated_at DESC LIMIT 10",
  ).all(project.id) as ScanNote[];

  const settings = db.prepare(
    "SELECT ai_provider, ai_base_url, ai_model, ai_api_key FROM user_settings LIMIT 1",
  ).get() as StoredScanSettings | undefined;
  const aiConfig = resolveAiRuntimeConfig(settings);
  if (!aiConfig) {
    throw new ScanServiceError("AI not configured. Add an API key in Settings or set AI_API_KEY.", 400);
  }

  const contextBundle = buildProjectContextBundle(project, gitInfo, rankedFiles, notes);
  const aiResponse = await createAIResponse(
    aiConfig,
    `${SCAN_USER_PROMPT}\n\n${contextBundle}`,
    SCAN_SYSTEM_PROMPT,
    4096,
    0.3,
  );
  const intelligence = extractJsonObject(aiResponse.content);

  const scanId = createId();
  const snapshotId = createId();
  const now = new Date().toISOString();
  const summary = `AI scan: ${stringValue(intelligence.projectDescription) || "Complete"}`;

  db.prepare(`
    INSERT INTO project_scan (id, project_id, scan_type, git_status_json, recent_commits_json, detected_files_json, todos_json, dirty_files_json, result_summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    scanId,
    project.id,
    "ai",
    JSON.stringify({
      branch: gitInfo.branch,
      defaultBranch: gitInfo.defaultBranch,
      isDirty: gitInfo.isDirty,
      dirtyFileCount: gitInfo.dirtyFiles.length,
      remoteUrl: gitInfo.remoteUrl,
    }),
    JSON.stringify(gitInfo.recentCommits),
    JSON.stringify(
      rankedFiles.slice(0, 50).map((file) => ({
        path: file.path,
        extension: file.extension,
        sizeBytes: file.sizeBytes,
        relevanceScore: file.relevanceScore,
      })),
    ),
    JSON.stringify(collectTodos(fileCandidates)),
    JSON.stringify(gitInfo.dirtyFiles),
    summary,
    now,
  );

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
    project.id,
    scanId,
    stringValue(intelligence.projectDescription) || "",
    stringValue(intelligence.projectType),
    JSON.stringify(arrayValue(intelligence.techStack)),
    stringValue(intelligence.architectureSummary) || "",
    stringValue(intelligence.currentStateSummary) || "",
    stringValue(intelligence.whereLeftOff) || "",
    JSON.stringify(arrayValue(intelligence.recentProgress)),
    JSON.stringify(arrayValue(intelligence.activeWorkAreas)),
    numberValue(intelligence.releaseReadinessPercent),
    numberValue(intelligence.completenessPercent),
    numberValue(intelligence.confidencePercent),
    stringValue(intelligence.releaseReadinessExplanation) || "",
    stringValue(intelligence.completenessExplanation) || "",
    JSON.stringify(objectValue(intelligence.readinessScoreBreakdown)),
    JSON.stringify(arrayValue(intelligence.blockers)),
    JSON.stringify(arrayValue(intelligence.risks)),
    JSON.stringify(arrayValue(intelligence.suggestedNextTasks)),
    JSON.stringify(arrayValue(intelligence.openQuestions)),
    JSON.stringify(arrayValue(intelligence.detectedFeatures)),
    JSON.stringify(arrayValue(intelligence.incompleteFeatures)),
    JSON.stringify(objectValue(intelligence.testingStatus)),
    JSON.stringify(objectValue(intelligence.documentationStatus)),
    JSON.stringify(gitInfo),
    JSON.stringify({ changedFiles: gitInfo.dirtyFiles, addedFiles: [], deletedFiles: [], lastModifiedFiles: gitInfo.dirtyFiles }),
    now,
  );

  db.prepare("UPDATE project SET last_ai_scanned_at = ?, last_scanned_at = ?, updated_at = ? WHERE id = ?")
    .run(now, now, now, project.id);

  return {
    scanId,
    snapshotId,
    projectId: project.id,
    scanType: "ai",
    scannedAt: now,
    summary,
    git: buildGitSummary(gitInfo),
    files: {
      totalScanned: fileCandidates.length,
      topFiles: rankedFiles.slice(0, 20).map((file) => ({
        path: file.path,
        extension: file.extension,
        sizeBytes: file.sizeBytes,
        relevanceScore: file.relevanceScore,
      })),
    },
    todos: collectTodos(fileCandidates),
    intelligence,
    persistence: {
      projectScanStored: true,
      intelligenceSnapshotStored: true,
      websiteReady: true,
    },
  };
}

function collectTodos(fileCandidates: FileScanCandidate[]) {
  const todos: Array<{ path: string; line: string }> = [];
  for (const candidate of fileCandidates.slice(0, 50)) {
    if (!candidate.containsTodo) {
      continue;
    }

    try {
      const content = readFileSync(candidate.absolutePath, "utf-8").slice(0, 5000);
      for (const line of content.split("\n")) {
        if (!/\bTODO\b|\bFIXME\b|\bXXX\b/i.test(line)) {
          continue;
        }

        todos.push({ path: candidate.path, line: line.trim().slice(0, 120) });
        if (todos.length >= 20) {
          return todos;
        }
      }
    } catch {
      continue;
    }
  }

  return todos;
}

function buildProjectContextBundle(
  project: ScanProject,
  gitInfo: Awaited<ReturnType<typeof getGitInfo>>,
  rankedFiles: ReturnType<typeof rankFiles>,
  notes: ScanNote[],
) {
  const contextBundle = buildContextBundle(rankedFiles.slice(0, 30), 8_000);
  return `
Project: ${project.name}
Description: ${project.description || "None"}

Git State:
- Branch: ${gitInfo.branch || "N/A"}
- Default branch: ${gitInfo.defaultBranch || "N/A"}
- Dirty: ${gitInfo.isDirty ? `Yes (${gitInfo.dirtyFiles.length} files)` : "No"}
- Remote: ${gitInfo.remoteUrl || "None"}

Recent Commits (last ${gitInfo.recentCommits.length}):
${gitInfo.recentCommits.slice(0, 10).map((commit) => `- ${commit.hash} ${commit.message} (${commit.author || "unknown"})`).join("\n")}

Dirty Files:
${gitInfo.dirtyFiles.slice(0, 20).join(", ") || "None"}

Recent Notes:
${notes.map((note) => `[${note.note_type}] ${note.title}\n${note.body_markdown.slice(0, 300)}`).join("\n\n") || "None"}

Context Bundle:
${contextBundle}
  `.slice(0, 20_000);
}

function buildGitSummary(gitInfo: Awaited<ReturnType<typeof getGitInfo>>): TriggeredScanGitSummary {
  return {
    branch: gitInfo.branch,
    defaultBranch: gitInfo.defaultBranch,
    isDirty: gitInfo.isDirty,
    dirtyFileCount: gitInfo.dirtyFiles.length,
    dirtyFiles: gitInfo.dirtyFiles.slice(0, 20),
    recentCommits: gitInfo.recentCommits.slice(0, 10),
    remoteUrl: gitInfo.remoteUrl,
  };
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0) ?? null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
