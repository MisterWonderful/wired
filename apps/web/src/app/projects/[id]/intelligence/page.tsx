"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, TrendingUp, Clock, MapPin, GitBranch } from "lucide-react";

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return Math.floor(diff / 86400000) + "d ago";
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

interface Project {
  id: string;
  name: string;
  description: string | null;
  source_type: string;
  current_branch: string | null;
  default_branch: string | null;
}

export default function IntelligencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch(`/api/projects/${id}/intelligence`).then(r => r.json()),
    ]).then(([p, data]) => {
      setProject(p);
      if (Array.isArray(data)) setSnapshots(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={20} style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Project not found</p>
      </div>
    );
  }

  const latest = snapshots[0];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", paddingBottom: "80px" }}>
      <header style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 16px", height: "56px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href={`/projects/${id}`} style={{ display: "flex", alignItems: "center", padding: "6px", textDecoration: "none" }}>
            <ArrowLeft size={16} style={{ color: "var(--text-muted)" }} />
          </Link>
          <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>Intelligence</span>
        </div>
      </header>

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 16px 0" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 4px" }}>{project.name}</h1>
          {project.description && <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>{project.description}</p>}
        </div>

        {/* Latest snapshot scores */}
        {latest && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "24px" }}>
            <div style={{ padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "600", color: latest.release_readiness_percent >= 80 ? "#22c55e" : latest.release_readiness_percent >= 50 ? "#f59e0b" : "#ef4444" }}>
                {latest.release_readiness_percent}%
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Release readiness</div>
            </div>
            <div style={{ padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "600", color: latest.completeness_percent >= 80 ? "#22c55e" : latest.completeness_percent >= 50 ? "#f59e0b" : "#ef4444" }}>
                {latest.completeness_percent}%
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Completeness</div>
            </div>
            <div style={{ padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "600", color: latest.confidence_percent >= 80 ? "#22c55e" : latest.confidence_percent >= 50 ? "#f59e0b" : "#a0a0a0" }}>
                {latest.confidence_percent}%
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Confidence</div>
            </div>
          </div>
        )}

        {/* Where you left off */}
        {latest && latest.where_left_off && (
          <section style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <MapPin size={14} style={{ color: "var(--text-muted)" }} />
              <h2 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", margin: 0 }}>Where you left off</h2>
            </div>
            <div style={{ padding: "14px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px" }}>
              <p style={{ fontSize: "13px", color: "var(--text-primary)", margin: 0, lineHeight: "1.6" }}>{latest.where_left_off}</p>
            </div>
          </section>
        )}

        {/* Suggested next tasks */}
        {latest && (() => {
          let tasks: string[] = [];
          try { tasks = JSON.parse(latest.suggested_next_tasks_json || "[]"); } catch {}
          if (tasks.length === 0) return null;
          return (
            <section style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <TrendingUp size={14} style={{ color: "var(--text-muted)" }} />
                <h2 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", margin: 0 }}>Suggested next tasks</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {tasks.slice(0, 5).map((task, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0, marginTop: "2px" }}>{i + 1}.</span>
                    <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{task}</span>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Blockers */}
        {latest && (() => {
          let blockers: string[] = [];
          try { blockers = JSON.parse(latest.blockers_json || "[]"); } catch {}
          if (blockers.length === 0) return null;
          return (
            <section style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: "600", color: "#ef4444", margin: "0 0 10px" }}>Blockers ({blockers.length})</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {blockers.map((b, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px" }}>
                    <span style={{ fontSize: "13px", color: "#dc2626" }}>{b}</span>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Scan history */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <Clock size={14} style={{ color: "var(--text-muted)" }} />
            <h2 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", margin: 0 }}>Scan history</h2>
          </div>
          {snapshots.length === 0 && (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "20px 0" }}>No intelligence snapshots yet. Run an AI scan to generate one.</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {snapshots.map(s => (
              <div key={s.id} style={{ padding: "12px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{timeAgo(s.created_at)}</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={{ fontSize: "11px", color: s.release_readiness_percent >= 80 ? "#22c55e" : "var(--text-muted)" }}>ready {s.release_readiness_percent}%</span>
                    <span style={{ fontSize: "11px", color: s.confidence_percent >= 80 ? "#22c55e" : "var(--text-muted)" }}>conf {s.confidence_percent}%</span>
                  </div>
                </div>
                {s.where_left_off && (
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>{s.where_left_off.slice(0, 120)}{s.where_left_off.length > 120 ? "…" : ""}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
