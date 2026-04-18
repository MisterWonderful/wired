// Wired Core Types

// ─── Project ─────────────────────────────────────────────────────────────────

export type ProjectSourceType = "local_folder" | "github" | "git_remote" | "manual";

export type ProjectStatus = "active" | "paused" | "archived";

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sourceType: ProjectSourceType;
  localPath?: string | null;
  remoteUrl?: string | null;
  githubOwner?: string | null;
  githubRepo?: string | null;
  defaultBranch?: string | null;
  currentBranch?: string | null;
  status: ProjectStatus;
  tags: string[];
  accentColor?: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  lastScannedAt?: string | null;
  lastAiScannedAt?: string | null;
  lastNoteSyncAt?: string | null;
  lastSummaryGeneratedAt?: string | null;
}

export interface ProjectSummary {
  id: string;
  projectId: string;
  summaryMarkdown: string;
  techStackJson: string;
  risksJson: string;
  suggestedNextTasksJson: string;
  sourceSnapshotHash: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Note ─────────────────────────────────────────────────────────────────────

export type NoteType =
  | "quick_note"
  | "idea"
  | "bug"
  | "feature"
  | "decision"
  | "research"
  | "task"
  | "meeting_note"
  | "architecture_note"
  | "prompt"
  | "scratchpad";

export type NoteStatus = "draft" | "enhanced" | "approved" | "synced" | "archived";

export type NoteSource = "web" | "desktop" | "mobile" | "import";

export interface Note {
  id: string;
  projectId: string;
  title: string;
  bodyMarkdown: string;
  enhancedBodyMarkdown?: string | null;
  noteType: NoteType;
  tags: string[];
  status: NoteStatus;
  pinned: boolean;
  source: NoteSource;
  syncTargetPath?: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}

// ─── Scan ─────────────────────────────────────────────────────────────────────

export type ScanType = "local" | "ai_deep";

export type ChangeSignificance = "none" | "minor" | "moderate" | "major";

export interface ProjectScan {
  id: string;
  projectId: string;
  scanType: ScanType;
  gitStatusJson: string;
  recentCommitsJson: string;
  detectedFilesJson: string;
  todosJson: string;
  dirtyFilesJson: string;
  resultSummary: string;
  createdAt: string;
}

// ─── Project Intelligence Snapshot ────────────────────────────────────────────

export interface ReadinessScoreBreakdown {
  coreFunctionality: number;
  buildAndRunConfidence: number;
  testCoverage: number;
  documentation: number;
  errorHandling: number;
  securityBasics: number;
  deploymentReadiness: number;
  uiPolish: number;
  maintainability: number;
}

export interface ProjectBlocker {
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  explanation: string;
  evidence: string[];
  suggestedFix?: string;
}

export interface ProjectRisk {
  title: string;
  riskLevel: "low" | "medium" | "high";
  explanation: string;
  evidence: string[];
}

export interface SuggestedTask {
  title: string;
  priority: "low" | "medium" | "high";
  category: "code" | "test" | "docs" | "design" | "security" | "release" | "research";
  explanation: string;
  relatedFiles: string[];
}

export interface DetectedFeature {
  name: string;
  status: "planned" | "in_progress" | "mostly_complete" | "complete" | "unknown";
  evidence: string[];
  relatedFiles: string[];
}

export interface TestingStatus {
  hasTests: boolean;
  testFrameworks: string[];
  lastKnownTestResult?: "pass" | "fail" | "unknown";
  coverageKnown: boolean;
  summary: string;
  missingTestAreas: string[];
}

export interface DocumentationStatus {
  hasReadme: boolean;
  hasDocsFolder: boolean;
  summary: string;
  missingDocs: string[];
}

export interface GitCommit {
  hash: string;
  message: string;
  author?: string;
  date?: string;
}

export interface GitSummary {
  currentBranch: string | null;
  defaultBranch: string | null;
  isDirty: boolean;
  dirtyFileCount: number;
  recentCommits: GitCommit[];
}

export interface FileChangeSummary {
  changedFiles: string[];
  addedFiles: string[];
  deletedFiles: string[];
  lastModifiedFiles: string[];
}

export interface ProjectIntelligenceSnapshot {
  id: string;
  projectId: string;
  scanId: string;
  projectDescription: string;
  projectType: string | null;
  techStack: string[];
  architectureSummary: string;
  currentStateSummary: string;
  whereLeftOff: string;
  recentProgress: string[];
  activeWorkAreas: string[];
  releaseReadinessPercent: number;
  completenessPercent: number;
  confidencePercent: number;
  releaseReadinessExplanation: string;
  completenessExplanation: string;
  readinessScoreBreakdown: ReadinessScoreBreakdown;
  blockers: ProjectBlocker[];
  risks: ProjectRisk[];
  suggestedNextTasks: SuggestedTask[];
  openQuestions: string[];
  detectedFeatures: DetectedFeature[];
  incompleteFeatures: DetectedFeature[];
  testingStatus: TestingStatus;
  documentationStatus: DocumentationStatus;
  gitSummary: GitSummary;
  fileChangeSummary: FileChangeSummary;
  createdAt: string;
}

// ─── Scan Settings ─────────────────────────────────────────────────────────────

export interface ProjectScanSettings {
  projectId: string;
  manualScansEnabled: boolean;
  timerScansEnabled: boolean;
  activeWorkScansEnabled: boolean;
  desktopWatcherEnabled: boolean;
  timerIntervalMinutes: number | null;
  activeWorkDebounceMinutes: number;
  aiDeepScansEnabled: boolean;
  aiScanOnMajorChange: boolean;
  aiScanOnNewCommit: boolean;
  aiScanOnBranchChange: boolean;
  aiScanOnNoteChange: boolean;
  maxAiScanFrequencyMinutes: number;
  maxFilesPerScan: number;
  maxFileSizeBytes: number;
  maxContextTokens: number;
  ignoredPaths: string[];
}

// ─── File Ranking ─────────────────────────────────────────────────────────────

export interface FileScanCandidate {
  path: string;
  absolutePath: string;
  sizeBytes: number;
  extension: string;
  lastModifiedAt?: string;
  changedSinceLastScan: boolean;
  mentionedInCommit: boolean;
  containsTodo: boolean;
  isConfig: boolean;
  isReadmeOrDoc: boolean;
  isEntryPoint: boolean;
  isTest: boolean;
  isIgnored: boolean;
}

export interface RankedFileCandidate extends FileScanCandidate {
  relevanceScore: number;
  reasonCodes: string[];
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export type SyncMode = "write_only" | "write_stage" | "write_stage_commit";

export type ConflictStatus = "none" | "conflict_detected" | "resolved";

export interface NoteSyncState {
  id: string;
  noteId: string;
  projectId: string;
  targetPath: string;
  lastSyncedHash: string | null;
  repoFileHash: string | null;
  conflictStatus: ConflictStatus;
  syncMode: SyncMode;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── User Settings ─────────────────────────────────────────────────────────────

export interface UserSettings {
  id: string;
  aiProvider: string;
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey: string;
  githubToken: string;
  defaultNoteSyncFolder: string;
  defaultSyncMode: SyncMode;
  theme: "light" | "dark" | "system";
  createdAt: string;
  updatedAt: string;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export type ActivityEventType =
  | "project_created"
  | "project_updated"
  | "project_scanned"
  | "project_ai_scanned"
  | "note_created"
  | "note_updated"
  | "note_enhanced"
  | "note_synced"
  | "scan_scheduled";

export interface ActivityEvent {
  id: string;
  projectId: string | null;
  noteId: string | null;
  type: ActivityEventType;
  title: string;
  message: string;
  metadataJson: string;
  createdAt: string;
}

// ─── Change Detection ─────────────────────────────────────────────────────────

export interface DesktopProjectChangeEvent {
  projectId: string;
  localPath: string;
  changedPaths: string[];
  eventTypes: ("create" | "modify" | "delete" | "rename")[];
  detectedAt: string;
}

// ─── Utility Types ─────────────────────────────────────────────────────────────

export function createId(): string {
  return crypto.randomUUID();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function createProjectSlug(name: string): string {
  return slugify(name);
}

// Default scan settings factory
export function defaultScanSettings(projectId: string): ProjectScanSettings {
  return {
    projectId,
    manualScansEnabled: true,
    timerScansEnabled: false,
    activeWorkScansEnabled: true,
    desktopWatcherEnabled: false,
    timerIntervalMinutes: null,
    activeWorkDebounceMinutes: 5,
    aiDeepScansEnabled: true,
    aiScanOnMajorChange: true,
    aiScanOnNewCommit: true,
    aiScanOnBranchChange: true,
    aiScanOnNoteChange: true,
    maxAiScanFrequencyMinutes: 15,
    maxFilesPerScan: 75,
    maxFileSizeBytes: 100_000,
    maxContextTokens: 120_000,
    ignoredPaths: [
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      "out",
      "coverage",
      "target",
      "vendor",
      ".turbo",
      ".cache",
    ],
  };
}

// Readiness calculation
export function calculateReleaseReadiness(b: ReadinessScoreBreakdown): number {
  return Math.round(
    b.coreFunctionality * 0.25 +
    b.buildAndRunConfidence * 0.15 +
    b.testCoverage * 0.15 +
    b.documentation * 0.10 +
    b.errorHandling * 0.10 +
    b.securityBasics * 0.10 +
    b.deploymentReadiness * 0.10 +
    b.uiPolish * 0.025 +
    b.maintainability * 0.025
  );
}

// File relevance scoring
export function scoreFileRelevance(f: FileScanCandidate): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (f.changedSinceLastScan) { score += 40; reasons.push("changedSinceLastScan"); }
  if (f.isReadmeOrDoc) { score += 35; reasons.push("readmeOrDoc"); }
  if (f.isConfig) { score += 25; reasons.push("config"); }
  if (f.isEntryPoint) { score += 25; reasons.push("entryPoint"); }
  if (f.mentionedInCommit) { score += 20; reasons.push("inRecentCommit"); }
  if (f.containsTodo) { score += 15; reasons.push("containsTodo"); }
  if (f.isTest) { score += 10; reasons.push("test"); }
  if (f.sizeBytes > 100_000) { score -= 30; reasons.push("oversized"); }
  if (f.isIgnored) { score -= 100; reasons.push("ignored"); }

  return { score, reasons };
}
