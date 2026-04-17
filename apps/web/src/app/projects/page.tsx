"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, FolderGit2, Globe, Folder, BookOpen, Pin, MoreHorizontal } from "lucide-react";

const SOURCE_ICONS: Record<string, typeof Folder> = {
  local_folder: Folder,
  github: FolderGit2,
  git_remote: Globe,
  manual: BookOpen,
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return Math.floor(diff / 86400000) + "d ago";
}

interface Project {
  id: string; name: string; description: string | null; source_type: string;
  local_path: string | null; github_owner: string | null; github_repo: string | null;
  current_branch: string | null; default_branch: string | null; status: string;
  tags: string; pinned: number; last_scanned_at: string | null; updated_at: string;
}

function ProjectCard({ project }: { project: Project }) {
  const Icon = SOURCE_ICONS[project.source_type] || Folder;
  let tags: string[] = [];
  try { tags = JSON.parse(project.tags || "[]"); } catch {}
  const branch = project.current_branch || project.default_branch;

  return (
    <Link href={"/projects/" + project.id} style={{ display: "block", textDecoration: "none", marginBottom: "8px" }}>
      <div style={{ padding: "14px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", transition: "border-color 0.15s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--text-muted)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "var(--bg-tertiary)" }}>
            <Icon size={14} style={{ color: "var(--text-muted)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              {project.pinned === 1 && <Pin size={11} style={{ color: "var(--text-muted)" }} />}
              <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{project.name}</span>
            </div>
            {project.description && <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.description}</p>}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const }}>
              {branch && <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", fontFamily: "monospace", background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{branch}</span>}
              <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize" }}>{project.source_type.replace("_", " ")}</span>
              {tags.slice(0, 3).map(t => <span key={t} style={{ fontSize: "11px", color: "var(--text-muted)" }}>#{t}</span>)}
              {project.last_scanned_at && <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "auto" }}>scanned {timeAgo(project.last_scanned_at)}</span>}
            </div>
          </div>
          <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", opacity: 0.4 }} onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
            <MoreHorizontal size={15} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "archived">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(data => { if (Array.isArray(data)) setProjects(data); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const allTags = Array.from(new Set(projects.flatMap(p => { try { return JSON.parse(p.tags || "[]"); } catch { return []; } })));
  const filtered = projects.filter(p => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search) { const s = search.toLowerCase(); if (!p.name.toLowerCase().includes(s) && !(p.description || "").toLowerCase().includes(s)) return false; }
    if (tagFilter) { try { if (!JSON.parse(p.tags || "[]").includes(tagFilter)) return false; } catch { return false; } }
    return true;
  });
  const pinned = filtered.filter(p => p.pinned === 1);
  const unpinned = filtered.filter(p => p.pinned !== 1);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <header style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 16px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <Link href="/" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>← Home</Link>
          <Link href="/projects/new"><button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "500", border: "none", background: "var(--text-primary)", color: "var(--bg-primary)", cursor: "pointer" }}><Plus size={14} /> Add project</button></Link>
        </div>
      </header>
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px 80px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 20px" }}>Projects</h1>
        <div style={{ marginBottom: "16px" }}>
          <div style={{ position: "relative", marginBottom: "10px" }}>
            <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input type="text" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: "12px", border: "1px solid var(--border)", background: "transparent", fontSize: "14px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {(["all", "active", "paused", "archived"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", background: filter === f ? "var(--bg-tertiary)" : "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)", textTransform: "capitalize" }}>{f}</button>
            ))}
          </div>
        </div>
        {allTags.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
            <button onClick={() => setTagFilter(null)} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", background: !tagFilter ? "var(--bg-tertiary)" : "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}>All tags</button>
            {allTags.map(t => (
              <button key={t} onClick={() => setTagFilter(tagFilter === t ? null : t)} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", background: tagFilter === t ? "var(--bg-tertiary)" : "transparent", color: tagFilter === t ? "var(--text-primary)" : "var(--text-muted)", border: "1px solid var(--border)" }}>#{t}</button>
            ))}
          </div>
        )}
        {loading && <p style={{ fontSize: "14px", color: "var(--text-muted)", textAlign: "center", padding: "40px 0" }}>Loading projects…</p>}
        {!loading && pinned.length > 0 && <div style={{ marginBottom: "20px" }}><p style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Pinned</p>{pinned.map(p => <ProjectCard key={p.id} project={p} />)}</div>}
        {!loading && unpinned.map(p => <ProjectCard key={p.id} project={p} />)}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", border: "1px solid var(--border)", borderRadius: "12px" }}>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "0 0 16px" }}>{search || filter !== "all" || tagFilter ? "No projects match your filters." : "No projects yet."}</p>
            {!search && filter === "all" && !tagFilter && <Link href="/projects/new" style={{ fontSize: "13px", color: "var(--text-secondary)", textDecoration: "none", padding: "8px 16px", border: "1px solid var(--border)", borderRadius: "8px" }}>Add your first project</Link>}
          </div>
        )}
      </main>
    </div>
  );
}
