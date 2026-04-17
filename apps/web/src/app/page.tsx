"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Settings, Zap, ArrowRight, FileText, Activity } from "lucide-react";

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return Math.floor(diff / 86400000) + "d ago";
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  source_type: string;
  tags: string;
  pinned: number;
  updated_at: string;
  last_ai_scanned_at: string | null;
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProjects(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pinnedProjects = projects.filter(p => p.pinned === 1);
  const recentProjects = [...projects].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);
  const needsAttention = projects.filter(p => {
    if (!p.last_ai_scanned_at) return true;
    return Date.now() - new Date(p.last_ai_scanned_at).getTime() > 7 * 86400000;
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <header style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 16px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Zap size={18} style={{ color: "var(--text-secondary)" }} />
            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Wired</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link href="/projects" style={{ fontSize: "13px", color: "var(--text-secondary)", textDecoration: "none", padding: "6px 10px", borderRadius: "8px" }}>Projects</Link>
            <Link href="/settings" style={{ color: "var(--text-secondary)", textDecoration: "none", padding: "6px" }}><Settings size={16} /></Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 16px 100px" }}>
        <section style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 6px" }}>Your projects</h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>
            {projects.length === 0 ? "Add a project to get started with AI-powered intelligence." : `${projects.length} project${projects.length !== 1 ? "s" : ""} total`}
          </p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "28px" }}>
          <Link href="/projects/new" style={{ textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", transition: "border-color 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--text-muted)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-tertiary)" }}><Plus size={18} style={{ color: "var(--text-secondary)" }} /></div>
              <div><div style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>Add project</div><div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Local, GitHub, or manual</div></div>
            </div>
          </Link>
          <Link href="/projects" style={{ textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", transition: "border-color 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--text-muted)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-tertiary)" }}><Activity size={18} style={{ color: "var(--text-secondary)" }} /></div>
              <div><div style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>All projects</div><div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Browse & manage</div></div>
            </div>
          </Link>
        </section>

        {!loading && pinnedProjects.length > 0 && (
          <section style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", margin: 0 }}>Pinned</h2>
              <Link href="/projects" style={{ fontSize: "12px", color: "var(--text-muted)", textDecoration: "none" }}>View all</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {pinnedProjects.map(p => (
                <Link key={p.id} href={"/projects/" + p.id} style={{ textDecoration: "none" }}>
                  <div style={{ padding: "12px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", transition: "border-color 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--text-muted)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "1px" }}>{p.description}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                      <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && recentProjects.length > 0 && (
          <section style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", margin: 0 }}>Recently updated</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {recentProjects.map(p => (
                <Link key={p.id} href={"/projects/" + p.id} style={{ textDecoration: "none" }}>
                  <div style={{ padding: "12px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", transition: "border-color 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--text-muted)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}>
                    <div><div style={{ fontSize: "14px", color: "var(--text-primary)" }}>{p.name}</div><div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>Updated {timeAgo(p.updated_at)}</div></div>
                    <ArrowRight size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && projects.length === 0 && (
          <section style={{ textAlign: "center", padding: "48px 0", marginBottom: "28px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", background: "var(--bg-tertiary)" }}><FileText size={20} style={{ color: "var(--text-muted)" }} /></div>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "0 0 16px" }}>No projects yet. Add your first project to get started.</p>
            <Link href="/projects/new" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "500", color: "var(--text-primary)", textDecoration: "none", padding: "8px 16px", borderRadius: "8px", background: "var(--bg-tertiary)" }}>Add a project <ArrowRight size={13} /></Link>
          </section>
        )}

        {!loading && needsAttention.length > 0 && (
          <section style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", margin: 0 }}>Needs attention</h2>
            </div>
            <div style={{ padding: "12px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px" }}>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 10px" }}>{needsAttention.length} project{needsAttention.length !== 1 ? "s" : ""} haven&apos;t been scanned recently.</p>
              {needsAttention.slice(0, 3).map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                  <Link href={"/projects/" + p.id} style={{ fontSize: "13px", color: "var(--text-primary)", textDecoration: "none" }}>{p.name}</Link>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{p.last_ai_scanned_at ? "scanned " + timeAgo(p.last_ai_scanned_at) : "never scanned"}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: "64px", borderRadius: "10px", background: "var(--bg-tertiary)", opacity: 0.5 }} />)}
          </div>
        )}
      </main>

      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, borderTop: "1px solid var(--border)", background: "var(--bg-primary)", display: "flex", justifyContent: "space-around", padding: "8px 0", paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        {[{href:"/",icon:Zap,label:"Home"},{href:"/projects",icon:Search,label:"Projects"},{href:"/projects/new",icon:Plus,label:"Add"},{href:"/settings",icon:Settings,label:"Settings"}].map(({href,icon:Icon,label}) => (
          <Link key={href} href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "4px 16px", textDecoration: "none" }}>
            <Icon size={18} style={{ color: "var(--text-muted)" }} /><span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
