"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, FolderGit2, Globe, Folder, BookOpen, Pin, MoreHorizontal } from "lucide-react";

const css = {
  bgPrimary: "#ffffff",
  bgSecondary: "#fafafa",
  bgTertiary: "#f5f5f5",
  bgCard: "#ffffff",
  border: "#e5e5e5",
  textPrimary: "#1a1a1a",
  textSecondary: "#6b6b6b",
  textMuted: "#a0a0a0",
};

const s = (vars: Record<string, string>) => vars as any;

const mockProjects = [
  { id: "1", name: "nomi-brief", description: "Daily AI news aggregator with Karakeep integration", sourceType: "local_folder" as const, localPath: "/home/ryan/homelab/nomi-brief", status: "active" as const, tags: ["nextjs", "postgres", "ai"], pinned: true, currentBranch: "main", lastScannedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "2", name: "openclaw", description: "AI familiar / personal assistant platform", sourceType: "github" as const, githubOwner: "openclaw", githubRepo: "openclaw", status: "active" as const, tags: ["typescript", "node", "ai"], pinned: false, currentBranch: "main", lastScannedAt: new Date(Date.now() - 86400000).toISOString() },
];

const sourceIcons: Record<string, typeof Folder|typeof BookOpen> = { local_folder: Folder, github: FolderGit2, git_remote: Globe, manual: BookOpen };

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return Math.floor(diff / 86400000) + "d ago";
}

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "archived">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const allTags = Array.from(new Set(mockProjects.flatMap(p => p.tags)));
  const filtered = mockProjects.filter(p => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.description || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (tagFilter && !p.tags.includes(tagFilter)) return false;
    return true;
  });

  return (
    <div className="min-h-screen" style={s({ "--bg-primary": css.bgPrimary, "--bg-secondary": css.bgSecondary, "--bg-tertiary": css.bgTertiary, "--bg-card": css.bgCard, "--border": css.border, "--text-primary": css.textPrimary, "--text-secondary": css.textSecondary, "--text-muted": css.textMuted })}>
      <header className="border-b sticky top-0 z-50 bg-white/80 backdrop-blur-sm" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>← Home</Link>
          <Link href="/projects/new">
            <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}>
              <Plus size={14} /> Add project
            </button>
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Projects</h1>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input type="text" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border bg-transparent outline-none" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "active", "paused", "archived"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className="text-xs px-3 py-1.5 rounded-lg capitalize" style={{ background: filter === f ? "var(--bg-tertiary)" : "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>{f}</button>
            ))}
          </div>
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <button onClick={() => setTagFilter(null)} className="text-xs px-2.5 py-1 rounded-md" style={{ background: !tagFilter ? "var(--bg-tertiary)" : "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}>All</button>
            {allTags.map(t => (
              <button key={t} onClick={() => setTagFilter(tagFilter === t ? null : t)} className="text-xs px-2.5 py-1 rounded-md" style={{ background: tagFilter === t ? "var(--bg-tertiary)" : "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{t}</button>
            ))}
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="text-center py-16 border rounded-xl" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No projects found</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(project => {
              const Icon = sourceIcons[project.sourceType] || Folder;
              return (
                <Link key={project.id} href={`/projects/${project.id}`} className="group block border rounded-xl p-4 hover:border-zinc-300 transition-all" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "var(--bg-tertiary)" }}><Icon size={15} style={{ color: "var(--text-muted)" }} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {project.pinned && <Pin size={12} style={{ color: "var(--text-muted)" }} />}
                          <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{project.name}</span>
                        </div>
                        {project.description && <p className="text-xs truncate mb-2" style={{ color: "var(--text-muted)" }}>{project.description}</p>}
                        <div className="flex items-center gap-3 flex-wrap">
                          {project.currentBranch && <span className="text-[11px] px-2 py-0.5 rounded-md font-mono" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{project.currentBranch}</span>}
                          {project.tags.map(t => <span key={t} className="text-[11px]" style={{ color: "var(--text-muted)" }}>#{t}</span>)}
                          {project.lastScannedAt && <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>scanned {timeAgo(project.lastScannedAt)}</span>}
                        </div>
                      </div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-zinc-100" style={{ color: "var(--text-muted)" }}><MoreHorizontal size={15} /></button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}