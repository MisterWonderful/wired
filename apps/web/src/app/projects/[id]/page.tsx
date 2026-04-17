"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, GitBranch, FileText, Loader2, RefreshCw, MapPin, Zap, TrendingUp } from "lucide-react";

function timeAgo(d: string): string {
  if (!d) return "never";
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return Math.floor(diff / 86400000) + "d ago";
}

function ScoreCard({ value, label, sublabel }: { value: number; label: string; sublabel: string }) {
  const color = value >= 80 ? "#22c55e" : value >= 60 ? "#f59e0b" : value >= 30 ? "#ef4444" : "#a0a0a0";
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", background: "var(--bg-card)" }}>
      <div style={{ fontSize: "28px", fontWeight: "600", marginBottom: "2px", color: "var(--text-primary)" }}>{value}%</div>
      <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>{label}</div>
      <div style={{ fontSize: "11px", marginTop: "2px", color: "var(--text-muted)" }}>{sublabel}</div>
    </div>
  );
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  source_type: string;
  local_path: string | null;
  current_branch: string | null;
  default_branch: string | null;
  status: string;
  tags: string;
  pinned: boolean;
  last_scanned_at: string | null;
  last_ai_scanned_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Snapshot {
  id: string;
  project_description: string;
  project_type: string | null;
  tech_stack_json: string;
  where_left_off: string;
  release_readiness_percent: number;
  completeness_percent: number;
  confidence_percent: number;
  readiness_score_breakdown_json: string;
  blockers_json: string;
  suggested_next_tasks_json: string;
  recent_progress_json: string;
  created_at: string;
}

export default function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [noteCount, setNoteCount] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((p) => { if (p) setProject(p); setLoading(false); })
      .catch(() => { setLoading(false); });

    fetch(`/api/projects/${id}/notes`)
      .then((r) => r.json())
      .then((notes) => setNoteCount(Array.isArray(notes) ? notes.length : 0))
      .catch(() => {});

    fetch(`/api/projects/${id}/intelligence`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data) && data.length > 0) setSnapshot(data[0]); })
      .catch(() => {});
  }, [id]);

  async function runScan(type: "local" | "ai") {
    setScanning(true);
    try {
      const endpoint = type === "ai"
        ? `/api/projects/${id}/scan/ai`
        : `/api/projects/${id}/scan/local`;
      await fetch(endpoint, { method: "POST" });
      // Refresh snapshot after scan
      if (type === "ai") {
        const r = await fetch(`/api/projects/${id}/intelligence`);
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) setSnapshot(data[0]);
      }
      // Refresh project for updated timestamps
      const pr = await fetch(`/api/projects/${id}`);
      if (pr.ok) setProject(await pr.json());
    } catch { /* ignore */ }
    finally { setScanning(false); }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading project…</span>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", gap: "12px" }}>
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Project not found.</p>
        <Link href="/projects" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Back to projects</Link>
      </div>
    );
  }

  const tags = JSON.parse(project.tags || "[]") as string[];
  const branch = project.current_branch || project.default_branch || "—";
  const techStack = snapshot ? JSON.parse(snapshot.tech_stack_json || "[]") as string[] : [];
  const blockers = snapshot ? JSON.parse(snapshot.blockers_json || "[]") as { title: string; severity: string; explanation: string }[] : [];
  const nextTasks = snapshot ? JSON.parse(snapshot.suggested_next_tasks_json || "[]") as { title: string; priority: string; explanation: string }[] : [];
  const recentProgress = snapshot ? JSON.parse(snapshot.recent_progress_json || "[]") as string[] : [];
  const readiness = snapshot ? JSON.parse(snapshot.readiness_score_breakdown_json || "{}") as Record<string, number> : {};

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 16px", height: "56px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/projects" style={{ color: "var(--text-muted)", textDecoration: "none", display: "flex", alignItems: "center", padding: "6px", marginLeft: "-6px", borderRadius: "8px" }}>
            <ArrowLeft size={16} />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{project.name}</h1>
            {project.description && <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{project.description}</p>}
          </div>
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            <button onClick={() => runScan("local")} disabled={scanning} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", cursor: scanning ? "not-allowed" : "pointer", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", opacity: scanning ? 0.6 : 1 }}>
              {scanning ? <Loader2 size={12} /> : <RefreshCw size={12} />} Local
            </button>
            <button onClick={() => runScan("ai")} disabled={scanning} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "500", cursor: scanning ? "not-allowed" : "pointer", border: "none", background: "var(--text-primary)", color: "var(--bg-primary)", opacity: scanning ? 0.6 : 1 }}>
              {scanning ? <Loader2 size={12} /> : <Zap size={12} />} AI scan
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "20px 16px 80px" }}>
        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "20px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", padding: "3px 8px", borderRadius: "6px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
            <GitBranch size={11} /> {branch}
          </span>
          <span style={{ fontSize: "12px", padding: "3px 8px", borderRadius: "6px", background: "var(--bg-tertiary)", color: "var(--text-muted)", textTransform: "capitalize" }}>
            {project.source_type.replace("_", " ")}
          </span>
          {tags.map((t) => <span key={t} style={{ fontSize: "12px", color: "var(--text-muted)" }}>#{t}</span>)}
          {project.last_scanned_at && <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "auto" }}>scanned {timeAgo(project.last_scanned_at)}</span>}
        </div>

        {/* AI Intelligence Card */}
        <div style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", background: "var(--bg-card)", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Project Intelligence</h2>
            {project.last_ai_scanned_at && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>AI scan {timeAgo(project.last_ai_scanned_at)}</span>}
          </div>

          {snapshot ? (
            <div>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "16px" }}>{snapshot.project_description}</p>
              {techStack.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                  {techStack.map((t) => <span key={t} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{t}</span>)}
                </div>
              )}

              {/* Readiness breakdown */}
              {Object.keys(readiness).length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Readiness breakdown</div>
                  {Object.entries(readiness).map(([key, val]) => (
                    <div key={key} style={{ marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{key.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                        <span style={{ fontSize: "12px", fontFamily: "monospace", color: val >= 80 ? "#22c55e" : val >= 60 ? "#f59e0b" : "#ef4444" }}>{val}%</span>
                      </div>
                      <div style={{ height: "3px", borderRadius: "9999px", background: "#f4f4f5" }}>
                        <div style={{ height: "100%", borderRadius: "9999px", width: `${val}%`, background: val >= 80 ? "#22c55e" : val >= 60 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {snapshot.where_left_off && (
                <div style={{ marginBottom: "16px", padding: "12px", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <MapPin size={13} style={{ color: "var(--text-secondary)" }} />
                    <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Where you left off</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>{snapshot.where_left_off}</p>
                </div>
              )}

              {blockers.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Blockers</div>
                  {blockers.map((b, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", fontWeight: "600", background: b.severity === "critical" ? "#fef2f2" : b.severity === "high" ? "#fff7ed" : "#f4f4f5", color: b.severity === "critical" ? "#dc2626" : b.severity === "high" ? "#ea580c" : "var(--text-muted)", flexShrink: 0, marginTop: "1px" }}>{b.severity}</span>
                      <div>
                        <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{b.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{b.explanation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {nextTasks.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Suggested next tasks</div>
                  {nextTasks.slice(0, 5).map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", fontWeight: "600", background: t.priority === "high" ? "#fef2f2" : t.priority === "medium" ? "#fffbeb" : "#f4f4f5", color: t.priority === "high" ? "#dc2626" : t.priority === "medium" ? "#d97706" : "var(--text-muted)", flexShrink: 0, marginTop: "2px" }}>{t.priority}</span>
                      <div>
                        <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{t.title}</div>
                        {t.explanation && <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{t.explanation}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🤖</div>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "0 0 16px" }}>No AI scan data yet.</p>
              <button onClick={() => runScan("ai")} disabled={scanning} style={{ padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: scanning ? "not-allowed" : "pointer", border: "none", background: "var(--text-primary)", color: "var(--bg-primary)" }}>
                {scanning ? "Scanning…" : "Run first AI scan"}
              </button>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          <Link href={`/projects/${id}/notes`} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg-card)", textDecoration: "none" }}>
            <FileText size={18} style={{ color: "var(--text-muted)" }} />
            <div>
              <div style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>Notes</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{noteCount} note{noteCount !== 1 ? "s" : ""}</div>
            </div>
          </Link>
          <Link href={`/projects/${id}/intelligence`} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg-card)", textDecoration: "none" }}>
            <TrendingUp size={18} style={{ color: "var(--text-muted)" }} />
            <div>
              <div style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>Intelligence</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Scan history</div>
            </div>
          </Link>
        </div>

        {/* Project info */}
        <div style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", background: "var(--bg-card)" }}>
          <h3 style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px" }}>Project info</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              ["Status", project.status],
              ["Source", project.source_type.replace("_", " ")],
              ["Added", new Date(project.created_at).toLocaleDateString()],
              ["Updated", timeAgo(project.updated_at)],
              ["Branch", branch],
              ["Notes", `${noteCount}`],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>{label}</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", textTransform: "capitalize" }}>{value}</div>
              </div>
            ))}
          </div>
          {project.local_path && (
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Local path</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "monospace", wordBreak: "break-all" }}>{project.local_path}</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
