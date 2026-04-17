"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitBranch, FileText, Loader2, RefreshCw, MapPin, AlertTriangle, CheckCircle2, Zap, TrendingUp } from "lucide-react";

const css = {
  bgPrimary: "#ffffff", bgSecondary: "#fafafa", bgTertiary: "#f5f5f5",
  bgCard: "#ffffff", border: "#e5e5e5",
  textPrimary: "#1a1a1a", textSecondary: "#6b6b6b", textMuted: "#a0a0a0",
};
const s = (v: Record<string, string>) => v as any;

const mockProject = {
  id: "1", name: "wired", description: "Self-hosted project intelligence and notes app",
  sourceType: "local_folder" as const, localPath: "/tmp/wired-demo", currentBranch: "main", defaultBranch: "main",
  status: "active" as const, tags: ["typescript", "nextjs", "tauri", "ai"], pinned: true,
  lastScannedAt: new Date(Date.now() - 3600000).toISOString(), lastAiScannedAt: new Date(Date.now() - 7200000).toISOString(),
};

const mockIntelli = {
  projectDescription: "A self-hosted project-memory, project-notes, and AI project-intelligence app with Mac desktop client and mobile-friendly web UI.",
  projectType: "Application Framework",
  techStack: ["TypeScript", "Next.js 15", "Tauri v2", "Drizzle ORM", "SQLite", "Tailwind CSS", "shadcn/ui"],
  architectureSummary: "Monorepo with pnpm workspaces. Next.js web app + Tauri desktop client. SQLite local-first with Postgres migration path.",
  currentStateSummary: "Phase 1 foundation building - core packages and web app scaffold created.",
  whereLeftOff: "Just initialized the monorepo. Built core packages (core, db, git, ai, sync, scanner, ui). Created web app with home, projects list, project dashboard, settings pages.",
  recentProgress: ["Initialized monorepo with pnpm workspace", "Created 7 shared packages with TypeScript", "Built web app with Tailwind CSS", "Implemented project registry and dashboard"],
  activeWorkAreas: ["Web app pages", "API routes", "Database integration"],
  releaseReadinessPercent: 15, completenessPercent: 10, confidencePercent: 75,
  releaseReadinessExplanation: "Early stage - foundation just built.",
  completenessExplanation: "MVP skeleton only.",
  readinessScoreBreakdown: { coreFunctionality: 10, buildAndRunConfidence: 25, testCoverage: 0, documentation: 30, errorHandling: 10, securityBasics: 20, deploymentReadiness: 10, uiPolish: 20, maintainability: 30 },
  blockers: [{ title: "No database integration yet", severity: "medium" as const, explanation: "Schema exists but no API routes connect to DB.", evidence: ["No /api routes created yet"] }],
  risks: [{ title: "Large scope", riskLevel: "medium" as const, explanation: "Full spec is very large.", evidence: ["33 implementation phases"] }],
  suggestedNextTasks: [
    { title: "Create /api/projects CRUD routes", priority: "high" as const, category: "code" as const, explanation: "Connect project registry to SQLite via Drizzle", relatedFiles: [] },
  ],
  openQuestions: ["Should desktop client be built in parallel?"],
  detectedFeatures: [{ name: "Project registry", status: "in_progress" as const, evidence: [], relatedFiles: [] }],
  testingStatus: { hasTests: false, testFrameworks: [], lastKnownTestResult: "unknown" as const, coverageKnown: false, summary: "No tests yet.", missingTestAreas: [] },
  documentationStatus: { hasReadme: false, hasDocsFolder: false, summary: "No docs yet.", missingDocs: [] },
  gitSummary: { currentBranch: "main", defaultBranch: "main", isDirty: true, dirtyFileCount: 3, recentCommits: [] },
  fileChangeSummary: { changedFiles: [], addedFiles: [], deletedFiles: [], lastModifiedFiles: [] },
};

function ReadinessMeter({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? "#22c55e" : value >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
        <span className="text-xs font-mono" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1 rounded-full bg-zinc-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function ScoreCard({ value, label, sublabel }: { value: number; label: string; sublabel: string }) {
  return (
    <div className="border rounded-xl p-4" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
      <div className="text-2xl font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>{value}%</div>
      <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</div>
      <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sublabel}</div>
    </div>
  );
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return Math.floor(diff / 86400000) + "d ago";
}

export default async function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [scanning, setScanning] = useState(false);
  const intelli = mockIntelli;

  async function runScan(_type: "local" | "ai") {
    setScanning(true);
    await new Promise(r => setTimeout(r, 2000));
    setScanning(false);
  }

  return (
    <div className="min-h-screen pb-20 sm:pb-8" style={s({ "--bg-primary": css.bgPrimary, "--bg-secondary": css.bgSecondary, "--bg-tertiary": css.bgTertiary, "--bg-card": css.bgCard, "--border": css.border, "--text-primary": css.textPrimary, "--text-secondary": css.textSecondary, "--text-muted": css.textMuted })}>
      <header className="border-b sticky top-0 z-50 bg-white/80 backdrop-blur-sm" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/projects" className="p-2 -ml-2 rounded-lg hover:bg-zinc-100"><ArrowLeft size={16} style={{ color: "var(--text-muted)" }} /></Link>
          <div className="flex-1 min-w-0"><span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{mockProject.name}</span></div>
          <div className="flex items-center gap-2">
            {scanning ? (
              <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}><Loader2 size={13} className="animate-spin" /> Scanning…</span>
            ) : (
              <>
                <button onClick={() => runScan("local")} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-zinc-50" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  <RefreshCw size={12} className="inline mr-1" />Local scan
                </button>
                <button onClick={() => runScan("ai")} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}>
                  <Zap size={12} className="inline mr-1" />AI scan
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs px-2.5 py-1 rounded-md font-mono" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}><GitBranch size={11} className="inline mr-1" />{mockProject.currentBranch}</span>
          {mockProject.tags.map(t => <span key={t} className="text-xs" style={{ color: "var(--text-muted)" }}>#{t}</span>)}
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>scanned {timeAgo(mockProject.lastScannedAt || "")}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <ScoreCard value={intelli.releaseReadinessPercent} label="Release readiness" sublabel="confidence 75%" />
          <ScoreCard value={intelli.completenessPercent} label="Completeness" sublabel="vs detected scope" />
          <ScoreCard value={intelli.confidencePercent} label="Confidence" sublabel="context quality" />
        </div>
        <div className="border rounded-xl p-5" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Project Intelligence</h2>
            {mockProject.lastAiScannedAt && <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>AI scan {timeAgo(mockProject.lastAiScannedAt)}</span>}
          </div>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{intelli.projectDescription}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>Tech stack</div>
                <div className="flex flex-wrap gap-1.5">{intelli.techStack.map(t => <span key={t} className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{t}</span>)}</div>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>Type</div>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{intelli.projectType}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Readiness breakdown</div>
              <ReadinessMeter value={intelli.readinessScoreBreakdown.coreFunctionality} label="Core functionality" />
              <ReadinessMeter value={intelli.readinessScoreBreakdown.buildAndRunConfidence} label="Build & run" />
              <ReadinessMeter value={intelli.readinessScoreBreakdown.testCoverage} label="Test coverage" />
              <ReadinessMeter value={intelli.readinessScoreBreakdown.documentation} label="Documentation" />
              <ReadinessMeter value={intelli.readinessScoreBreakdown.deploymentReadiness} label="Deployment" />
            </div>
          </div>
        </div>
        <div className="border rounded-xl p-5" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <div className="flex items-center gap-2 mb-3"><MapPin size={15} style={{ color: "var(--text-secondary)" }} /><h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Where you left off</h2></div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{intelli.whereLeftOff}</p>
          {intelli.recentProgress.length > 0 && (
            <div className="mb-3">
              <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Recent progress</div>
              <ul className="space-y-1.5">{intelli.recentProgress.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#22c55e" }} />
                  {r}
                </li>
              ))}</ul>
            </div>
          )}
          {intelli.suggestedNextTasks.length > 0 && (
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Suggested next tasks</div>
              <ul className="space-y-2">{intelli.suggestedNextTasks.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5 ${(t.priority as string) === "high" ? "bg-red-100 text-red-700" : (t.priority as string) === "medium" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600"}`}>{t.priority}</span>
                  <span>
                    <span style={{ color: "var(--text-primary)" }}>{t.title}</span>
                    {t.explanation && <span className="block mt-0.5" style={{ color: "var(--text-muted)" }}>{t.explanation}</span>}
                  </span>
                </li>
              ))}</ul>
            </div>
          )}
        </div>
        {intelli.blockers.length > 0 && (
          <div className="border rounded-xl p-5" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <div className="flex items-center gap-2 mb-3"><AlertTriangle size={15} style={{ color: "#f59e0b" }} /><h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Blockers</h2></div>
            <div className="space-y-2">{intelli.blockers.map((b, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5 ${(b.severity as string) === "high" ? "bg-orange-100 text-orange-700" : (b.severity as string) === "medium" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600"}`}>{b.severity}</span>
                <div>
                  <span style={{ color: "var(--text-primary)" }}>{b.title}</span>
                  <span className="block mt-0.5" style={{ color: "var(--text-muted)" }}>{b.explanation}</span>
                </div>
              </div>
            ))}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/projects/${id}/notes`} className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:border-zinc-300" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <FileText size={16} style={{ color: "var(--text-muted)" }} />
            <div><div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Notes</div><div className="text-xs" style={{ color: "var(--text-muted)" }}>Project notepad</div></div>
          </Link>
          <Link href={`/projects/${id}/intelligence`} className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:border-zinc-300" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <TrendingUp size={16} style={{ color: "var(--text-muted)" }} />
            <div><div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Intelligence history</div><div className="text-xs" style={{ color: "var(--text-muted)" }}>Scan timeline</div></div>
          </Link>
        </div>
      </main>
    </div>
  );
}