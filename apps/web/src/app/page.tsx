"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  description: string | null;
  source_type: string;
  source_label?: string;
  branch?: string;
  status: "active" | "paused" | "archived";
  tags: string[];
  pinned: boolean;
  updated_at: string;
  scanned_at?: string | null;
  notes_count?: number;
  readiness?: number;
  completeness?: number;
  confidence?: number;
  tech?: string[];
  where?: string;
  breakdown?: Record<string, number>;
  blockers?: Array<{ sev: string; title: string; why?: string }>;
  tasks?: Array<{ p: string; title: string; why?: string }>;
  progress?: string[];
}

interface Note {
  id: string;
  type: string;
  title: string;
  tags: string[];
  updated: string;
  pinned: boolean;
  preview: string;
}

interface Activity {
  t: string;
  who: string;
  project: string;
  verb: string;
  detail: string;
}

type Theme = "ink" | "paper" | "slate";
type Accent = "amber" | "electric" | "lime" | "rose" | "graphite";
type Density = "tight" | "regular" | "roomy";

interface Route { name: string; id?: string; }
interface Settings { instance_name: string; timezone: string; }

// Raw API shapes
interface RawProject {
  id: string; name: string; slug?: string; description?: string | null;
  source_type?: string; local_path?: string | null; remote_url?: string | null;
  github_owner?: string | null; github_repo?: string | null;
  status?: string; tags?: string; pinned?: number;
  updated_at?: string; last_ai_scanned_at?: string | null;
}

interface RawNote {
  id: string; project_id?: string; title?: string; body_markdown?: string;
  note_type?: string; tags?: string; status?: string; pinned?: number;
  source?: string; created_at?: string; updated_at?: string;
}

function normalizeProject(r: RawProject): Project {
  let tags: string[] = [];
  try { tags = r.tags ? JSON.parse(r.tags) : []; } catch {}
  const source_label = r.github_owner && r.github_repo
    ? r.github_owner + "/" + r.github_repo
    : r.local_path ?? r.remote_url ?? r.source_type ?? "—";
  return {
    id: r.id, name: r.name,
    description: r.description ?? null,
    source_type: r.source_type ?? "manual",
    source_label,
    branch: "main",
    status: (r.status as Project["status"]) ?? "active",
    tags, pinned: !!r.pinned,
    updated_at: r.updated_at ?? new Date().toISOString(),
    scanned_at: r.last_ai_scanned_at ?? null,
    notes_count: 0, readiness: undefined, completeness: undefined, confidence: undefined,
    tech: [], where: undefined, breakdown: undefined, blockers: [], tasks: [], progress: [],
  };
}

function normalizeNote(r: RawNote): Note {
  let tags: string[] = [];
  try { tags = r.tags ? JSON.parse(r.tags) : []; } catch {}
  return {
    id: r.id, type: r.note_type ?? "quick_note", title: r.title ?? "Untitled",
    tags, updated: r.updated_at ?? r.created_at ?? new Date().toISOString(),
    pinned: !!r.pinned, preview: r.body_markdown ?? "",
  };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const paths: Record<string, string> = {
  zap: "M13 2 3 14h7v8l10-12h-7z",
  plus: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm7 2-4.3-4.3",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.8a7.4 7.4 0 0 0-2-1.2L14.5 3h-5l-.4 2.4a7.4 7.4 0 0 0-2 1.2l-2.4-.8-2 3.4 2 1.6A7.4 7.4 0 0 0 4.6 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.8a7.4 7.4 0 0 0 2 1.2l.4 2.4h5l.4-2.4a7.4 7.4 0 0 0 2-1.2l2.4.8 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
  arrow: "M5 12h14M13 5l7 7-7 7",
  arrowUpRight: "M7 17 17 7M7 7h10v10",
  pin: "M12 17v5M9 3h6l-1 6 3 3H7l3-3-1-6z",
  git: "M6 3v12a3 3 0 0 0 3 3h6M6 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  refresh: "M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5",
  check: "M20 6 9 17l-5-5",
  x: "M18 6 6 18M6 6l12 12",
  dot: "M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  sparkle: "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2",
  pulse: "M3 12h4l3-9 4 18 3-9h4",
  chevron: "m9 18 6-6-6-6",
  layout: "M3 3h18v6H3zM3 13h8v8H3zM13 13h8v8h-8z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  menu: "M3 6h18M3 12h18M3 18h18",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5c0 1.4 1.1 2.5 2.5 2.5H20",
  arrowLeft: "M19 12H5M11 5l-7 7 7 7",
  close: "M18 6 6 18M6 6l12 12",
};

function Icon({ name, size = 14, stroke = 1.5 }: { name: string; size?: number; stroke?: number }) {
  const d = paths[name] || paths.dot;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h";
  if (diff < 7 * 86_400_000) return Math.floor(diff / 86_400_000) + "d";
  return Math.floor(diff / (7 * 86_400_000)) + "w";
}

const NOTE_META: Record<string, { label: string }> = {
  quick_note: { label: "Note" }, idea: { label: "Idea" }, bug: { label: "Bug" },
  feature: { label: "Feature" }, decision: { label: "Decision" }, research: { label: "Research" },
  task: { label: "Task" }, meeting_note: { label: "Meeting" },
  architecture_note: { label: "Arch" }, prompt: { label: "Prompt" }, scratchpad: { label: "Scratch" },
};

// ─── Wordmark ─────────────────────────────────────────────────────────────────

function Wordmark({ size = 18 }: { size?: number }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ color: "var(--accent)" }}>
        <path d="M3 12 L7 12 L9 5 L13 19 L15 12 L21 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontFamily: "var(--font-serif)", fontSize: size + 6, letterSpacing: "-0.02em", lineHeight: 1, color: "var(--fg)" }}>Wired</span>
    </div>
  );
}

// ─── ReadinessDial ────────────────────────────────────────────────────────────

function ReadinessDial({ value, size = 160 }: { value: number; size?: number }) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hairline)" strokeWidth="1" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth="1.5"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="num" style={{ fontSize: size * 0.38, lineHeight: 1, color: "var(--fg)" }}>{value}<span style={{ fontSize: size * 0.15, color: "var(--fg-muted)" }}>%</span></div>
        <div className="kicker" style={{ marginTop: 6 }}>Readiness</div>
      </div>
    </div>
  );
}

// ─── Bar ─────────────────────────────────────────────────────────────────────

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 36px", gap: 10, alignItems: "center", padding: "6px 0" }}>
      <div style={{ fontSize: 12, color: "var(--fg-muted)", textTransform: "capitalize" }}>{label}</div>
      <div style={{ position: "relative", height: 2, background: "var(--hairline)", borderRadius: 2 }}>
        <div style={{ position: "absolute", inset: 0, width: value + "%", background: "var(--fg)", borderRadius: 2, transition: "width .6s ease" }} />
      </div>
      <div className="mono" style={{ fontSize: 11, color: "var(--fg-muted)", textAlign: "right" }}>{value}%</div>
    </div>
  );
}

// ─── StatusDot / SourceIcon / Sparkline ──────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { active: "var(--good)", paused: "var(--warn)", archived: "var(--fg-dim)" };
  return <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: colors[status] || "var(--fg-dim)" }} />;
}

function SourceIcon({ source }: { source: string }) {
  const map: Record<string, string> = { github: "git", local_folder: "folder", git_remote: "globe", manual: "book" };
  return <Icon name={map[source] || "folder"} size={12} />;
}

function Sparkline({ data, w = 80, h = 20 }: { data: number[]; w?: number; h?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return <svg width={w} height={h} style={{ overflow: "visible" }}><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" /></svg>;
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function Topbar({ title, subtitle, right }: { title: string; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 40px", borderBottom: "1px solid var(--hairline)", background: "var(--bg)", position: "sticky" as const, top: 0, zIndex: 10, minHeight: 72 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1, color: "var(--fg)" }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>{subtitle}</div>}
        </div>
      </div>
      {right}
    </header>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ route, setRoute, projects }: { route: Route; setRoute: (r: Route) => void; projects: Project[] }) {
  const [query, setQuery] = useState("");
  const filtered = query ? projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase())) : projects;
  const pinned = filtered.filter(p => p.pinned);
  const rest = filtered.filter(p => !p.pinned && p.status === "active");
  const archived = filtered.filter(p => p.status !== "active");

  const navItem = (key: string, label: string, icon: string) => {
    const active = route.name === key;
    return (
      <button onClick={() => setRoute({ name: key })}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", width: "100%", textAlign: "left" as const, fontSize: 13, color: active ? "var(--fg)" : "var(--fg-muted)", background: active ? "var(--panel-2)" : "transparent", borderRadius: 4, transition: "background .12s" }}>
        <Icon name={icon} size={14} /><span>{label}</span>
      </button>
    );
  };

  const projectRow = (p: Project) => {
    const active = route.name === "project" && route.id === p.id;
    return (
      <button key={p.id} onClick={() => setRoute({ name: "project", id: p.id })}
        style={{ display: "grid", gridTemplateColumns: "14px 1fr auto", gap: 10, padding: "5px 10px", width: "100%", textAlign: "left" as const, fontSize: 12.5, color: active ? "var(--fg)" : "var(--fg-muted)", background: active ? "var(--panel-2)" : "transparent", borderRadius: 4, alignItems: "center" }}>
        <StatusDot status={p.status} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{p.name}</span>
        <span className="mono" style={{ fontSize: 10, color: "var(--fg-dim)" }}>{p.notes_count ?? 0}</span>
      </button>
    );
  };

  return (
    <aside style={{ width: 244, flexShrink: 0, height: "100vh", overflow: "auto", background: "var(--bg-sunken)", borderRight: "1px solid var(--hairline)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 16px 12px" }}>
        <button onClick={() => setRoute({ name: "home" })} style={{ display: "block" }}><Wordmark size={18} /></button>
      </div>
      <div style={{ padding: "0 10px 8px", position: "relative" }}>
        <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-dim)" }}><Icon name="search" size={12} /></div>
        <input placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)}
          style={{ width: "100%", padding: "7px 10px 7px 28px", background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: 4, fontSize: 12, color: "var(--fg)", outline: "none" }}
          onFocus={e => e.target.style.borderColor = "var(--hairline-strong)"}
          onBlur={e => e.target.style.borderColor = "var(--hairline)"} />
        <span className="mono" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "var(--fg-dim)" }}>K</span>
      </div>
      <div style={{ padding: "4px 6px" }}>
        {navItem("home", "Overview", "pulse")}
        {navItem("projects", "All projects", "layout")}
        {navItem("activity", "Activity", "clock")}
        {navItem("settings", "Settings", "settings")}
      </div>
      <div style={{ padding: "16px 16px 6px" }}><div className="kicker">Pinned</div></div>
      <div style={{ padding: "0 6px" }}>{pinned.map(projectRow)}</div>
      <div style={{ padding: "14px 16px 6px" }}><div className="kicker">Active</div></div>
      <div style={{ padding: "0 6px" }}>{rest.map(projectRow)}</div>
      {archived.length > 0 && <>
        <div style={{ padding: "14px 16px 6px" }}><div className="kicker">Other</div></div>
        <div style={{ padding: "0 6px" }}>{archived.map(projectRow)}</div>
      </>}
      <div style={{ marginTop: "auto", padding: 12, borderTop: "1px solid var(--hairline)", display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => setRoute({ name: "new" })} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 10px", border: "1px solid var(--hairline)", borderRadius: 4, fontSize: 12, color: "var(--fg-muted)" }}>
          <Icon name="plus" size={12} /> Add project
        </button>
      </div>
    </aside>
  );
}

// ─── MobileSidebar ────────────────────────────────────────────────────────────

function MobileSidebar({ open, onClose, route, setRoute, projects }: {
  open: boolean; onClose: () => void; route: Route; setRoute: (r: Route) => void; projects: Project[];
}) {
  const [query, setQuery] = useState("");
  const filtered = query ? projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase())) : projects;
  return (
    <>
      {open && <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)" }} onClick={onClose} />}
      {open && (
        <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 260, zIndex: 70, background: "var(--bg-sunken)", borderRight: "1px solid var(--hairline)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "18px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={() => { setRoute({ name: "home" }); onClose(); }}><Wordmark size={18} /></button>
            <button onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
          <div style={{ padding: "0 10px 8px" }}>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-dim)" }}><Icon name="search" size={12} /></div>
              <input placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)}
                style={{ width: "100%", padding: "7px 10px 7px 28px", background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: 4, fontSize: 12, color: "var(--fg)", outline: "none" }} />
            </div>
          </div>
          <div style={{ padding: "4px 6px" }}>
            {([["home","Overview","pulse"],["projects","All projects","layout"],["activity","Activity","clock"],["settings","Settings","settings"]] as [string,string,string][]).map(([key, label, icon]) => (
              <button key={key} onClick={() => { setRoute({ name: key }); onClose(); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", width: "100%", textAlign: "left" as const, fontSize: 13, color: route.name === key ? "var(--fg)" : "var(--fg-muted)", background: route.name === key ? "var(--panel-2)" : "transparent", borderRadius: 4 }}>
                <Icon name={icon} size={14} />{label}
              </button>
            ))}
          </div>
          <div style={{ padding: "12px 16px 6px", flex: 1, overflowY: "auto" as const }}>
            <div className="kicker" style={{ marginBottom: 6 }}>Projects</div>
            {filtered.map(p => (
              <button key={p.id} onClick={() => { setRoute({ name: "project", id: p.id }); onClose(); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", width: "100%", textAlign: "left" as const, fontSize: 12.5, color: route.name === "project" && route.id === p.id ? "var(--fg)" : "var(--fg-muted)", background: route.name === "project" && route.id === p.id ? "var(--panel-2)" : "transparent", borderRadius: 4 }}>
                <StatusDot status={p.status} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{p.name}</span>
                <span className="mono" style={{ fontSize: 10, color: "var(--fg-dim)" }}>{p.notes_count ?? 0}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: 12, borderTop: "1px solid var(--hairline)" }}>
            <button onClick={() => { setRoute({ name: "new" }); onClose(); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 10px", border: "1px solid var(--hairline)", borderRadius: 4, fontSize: 12, color: "var(--fg-muted)" }}>
              <Icon name="plus" size={12} /> Add project
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── BottomNav ────────────────────────────────────────────────────────────────

function BottomNav({ route, setRoute }: { route: Route; setRoute: (r: Route) => void }) {
  const items = [["home","Home","pulse"],["projects","Projects","layout"],["activity","Activity","clock"],["settings","Settings","settings"]] as const;
  return (
    <nav className="bottom-nav">
      {items.map(([key, label, icon]) => (
        <button key={key} onClick={() => setRoute({ name: key })} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 20px", color: route.name === key ? "var(--accent)" : "var(--fg-muted)" }}>
          <Icon name={icon} size={18} /><span style={{ fontSize: 10 }}>{label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── PinnedRow ─────────────────────────────────────────────────────────────────

function PinnedRow({ p, onOpen }: { p: Project; onOpen: () => void }) {
  return (
    <button onClick={onOpen}
      style={{ display: "grid", gridTemplateColumns: "1fr 120px 60px 20px", gap: 20, padding: "16px 0", borderBottom: "1px solid var(--hairline)", width: "100%", textAlign: "left" as const, alignItems: "center" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--panel-2)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <StatusDot status={p.status} />
          <span style={{ fontSize: 14.5, color: "var(--fg)", fontWeight: 500 }}>{p.name}</span>
          {p.branch && <span className="mono" style={{ fontSize: 10, color: "var(--fg-dim)" }}>{p.branch}</span>}
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{p.description ?? p.where ?? ""}</div>
      </div>
      <div>
        <div style={{ height: 2, background: "var(--hairline)", position: "relative", marginBottom: 4 }}>
          <div style={{ position: "absolute", inset: 0, width: (p.readiness ?? 0) + "%", background: "var(--accent)" }} />
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--fg-dim)" }}>READINESS</div>
      </div>
      <div className="num" style={{ fontSize: 22, color: "var(--fg)", textAlign: "right" }}>{p.readiness ?? 0}<span style={{ fontSize: 12, color: "var(--fg-dim)" }}>%</span></div>
      <Icon name="chevron" size={12} />
    </button>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────

function Home({ projects, activity, setRoute }: { projects: Project[]; activity: Activity[]; setRoute: (r: Route) => void }) {
  const pinned = projects.filter(p => p.pinned);
  const active = projects.filter(p => p.status === "active");
  const totalNotes = projects.reduce((s, p) => s + (p.notes_count ?? 0), 0);
  const attention = projects.filter(p => { if (!p.scanned_at) return true; return Date.now() - new Date(p.scanned_at).getTime() > 3 * 86400000; });
  const avgReadiness = active.length > 0 ? Math.round(active.reduce((s, p) => s + (p.readiness ?? 0), 0) / active.length) : 0;
  const sparkData = [32, 28, 40, 38, 45, 50, 48, 55, 62, 58, 64, avgReadiness];

  return (
    <div>
      <Topbar title="Overview" subtitle={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        right={<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="live-dot" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-muted)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--good)" }} /> synced
          </span>
          <button style={{ padding: "8px 14px", border: "1px solid var(--hairline)", borderRadius: 4, fontSize: 12, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="refresh" size={12} /> Scan all</button>
          <button onClick={() => setRoute({ name: "new" })} style={{ padding: "8px 14px", background: "var(--fg)", color: "var(--bg)", borderRadius: 4, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={12} /> New project</button>
        </div>} />
      <main style={{ padding: "28px 40px 100px", maxWidth: 1280 }}>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)", marginBottom: 40 }}>
          {([
            { k: "Active projects", v: active.length, sub: projects.length + " total" },
            { k: "Notes this week", v: 14, sub: totalNotes + " total" },
            { k: "Avg. readiness", v: avgReadiness + "%", sub: "+6 past 7d" },
            { k: "Needs attention", v: attention.length, sub: attention.length ? "blockers or stale" : "all clear" },
          ] as {k:string;v:string|number;sub:string}[]).map((s, i) => (
            <div key={s.k} style={{ padding: "20px 24px", borderLeft: i ? "1px solid var(--hairline)" : "none" }}>
              <div className="kicker" style={{ marginBottom: 10 }}>{s.k}</div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <div className="num" style={{ fontSize: 42, lineHeight: 1, color: "var(--fg)" }}>{s.v}</div>
                {i === 2 && <div style={{ color: "var(--fg-dim)" }}><Sparkline data={sparkData} w={70} h={20} /></div>}
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-dim)", marginTop: 6 }}>{s.sub}</div>
            </div>
          ))}
        </section>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 48 }}>
          <section>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>Pinned</h2>
              <button onClick={() => setRoute({ name: "projects" })} className="hl" style={{ fontSize: 11, color: "var(--fg-muted)" }}>All projects</button>
            </div>
            <div style={{ borderTop: "1px solid var(--hairline)" }}>
              {pinned.length > 0 ? pinned.map(p => <PinnedRow key={p.id} p={p} onOpen={() => setRoute({ name: "project", id: p.id })} />)
                : <div style={{ padding: "24px 0", fontSize: 13, color: "var(--fg-muted)" }}>No pinned projects yet.</div>}
            </div>
            {attention.length > 0 && <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "36px 0 14px" }}>
                <h2 style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>Needs attention</h2>
                <span className="mono" style={{ fontSize: 10, color: "var(--fg-dim)" }}>{attention.length} ITEMS</span>
              </div>
              <div style={{ borderTop: "1px solid var(--hairline)" }}>
                {attention.slice(0, 4).map(p => (
                  <button key={p.id} onClick={() => setRoute({ name: "project", id: p.id })} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--hairline)", width: "100%", textAlign: "left" as const, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, color: "var(--fg)", marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>
                        {!p.scanned_at ? <><span style={{ color: "var(--bad)" }}>*</span> Never scanned</> : <>Last scan {timeAgo(p.scanned_at)} ago</>}
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--fg-dim)" }}>{p.readiness ?? 0}%</div>
                    <Icon name="chevron" size={12} />
                  </button>
                ))}
              </div>
            </>}
          </section>
          <section>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>Recent activity</h2>
              <button onClick={() => setRoute({ name: "activity" })} className="hl" style={{ fontSize: 11, color: "var(--fg-muted)" }}>View all</button>
            </div>
            <div style={{ borderTop: "1px solid var(--hairline)" }}>
              {activity.slice(0, 8).map((a, i) => (
                <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid var(--hairline)", display: "grid", gridTemplateColumns: "56px 1fr", gap: 12 }}>
                  <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-dim)", paddingTop: 2 }}>{timeAgo(a.t)}</div>
                  <div>
                    <div style={{ fontSize: 12.5, color: "var(--fg)" }}><span style={{ color: "var(--fg-muted)" }}>{a.who}</span> {a.verb} <span style={{ color: "var(--accent)" }}>{a.project}</span></div>
                    {a.detail && <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 2 }}>{a.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <section style={{ marginTop: 48 }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--fg-muted)", maxWidth: 620, fontStyle: "italic", lineHeight: 1.4 }}>
            "Where did I leave off?" — the question Wired was built to answer. Pick a project from the left to see the map, the blockers, and the next move.
          </div>
        </section>
      </main>
    </div>
  );
}

// ─── ProjectsList ────────────────────────────────────────────────────────────

function ProjectsList({ projects, setRoute }: { projects: Project[]; setRoute: (r: Route) => void }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("updated");

  const filtered = projects.filter(p => {
    if (status !== "all" && p.status !== status) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !(p.description ?? "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "readiness") return (b.readiness ?? 0) - (a.readiness ?? 0);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return (
    <div>
      <Topbar title="Projects" subtitle={filtered.length + " of " + projects.length}
        right={<button onClick={() => setRoute({ name: "new" })} style={{ padding: "8px 14px", background: "var(--fg)", color: "var(--bg)", borderRadius: 4, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={12} /> New project</button>} />
      <main style={{ padding: "28px 40px 100px", maxWidth: 1280 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px 0", borderBottom: "1px solid var(--hairline)" }}>
          <div style={{ position: "relative", flex: "0 0 280px" }}>
            <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", color: "var(--fg-dim)" }}><Icon name="search" size={13} /></div>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter projects…"
              style={{ width: "100%", padding: "6px 6px 6px 22px", background: "transparent", border: "none", fontSize: 13, color: "var(--fg)", outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {(["all","active","paused","archived"] as const).map(s => (
              <button key={s} onClick={() => setStatus(s)} style={{ fontSize: 12, color: status === s ? "var(--fg)" : "var(--fg-muted)", textTransform: "capitalize", padding: "4px 0" }}>{s}</button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "var(--fg-muted)" }}>
            <span className="kicker">Sort</span>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: "transparent", border: "none", fontSize: 12, color: "var(--fg)", cursor: "pointer", outline: "none" }}>
              <option value="updated">Recently updated</option><option value="name">Name</option><option value="readiness">Readiness</option>
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "28px 2.2fr 1.2fr 80px 90px 90px 20px", gap: 16, padding: "14px 0 10px", borderBottom: "1px solid var(--hairline)" }}>
          {["","Project","Branch / source","Notes","Readiness","Updated",""].map((h, i) => <div key={i} className="kicker">{h}</div>)}
        </div>
        {filtered.map(p => (
          <button key={p.id} onClick={() => setRoute({ name: "project", id: p.id })}
            style={{ display: "grid", gridTemplateColumns: "28px 2.2fr 1.2fr 80px 90px 90px 20px", gap: 16, padding: "16px 0", borderBottom: "1px solid var(--hairline)", width: "100%", textAlign: "left" as const, alignItems: "center" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--panel-2)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg-muted)" }}>{p.pinned && <Icon name="pin" size={11} />}<StatusDot status={p.status} /></div>
            <div><div style={{ fontSize: 14, color: "var(--fg)", fontWeight: 500, marginBottom: 2 }}>{p.name}</div><div style={{ fontSize: 11.5, color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{p.description}</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--fg-muted)", minWidth: 0 }}><SourceIcon source={p.source_type} /><span className="mono" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{p.branch ?? p.source_label ?? p.source_type}</span></div>
            <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>{p.notes_count ?? 0}</div>
            <div><div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 3 }}><span className="num" style={{ fontSize: 15, color: "var(--fg)" }}>{p.readiness ?? 0}</span><span className="mono" style={{ fontSize: 10, color: "var(--fg-dim)" }}>%</span></div><div style={{ height: 1, background: "var(--hairline)", position: "relative" as const }}><div style={{ position: "absolute", inset: 0, width: (p.readiness ?? 0) + "%", background: "var(--accent)" }} /></div></div>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-dim)" }}>{timeAgo(p.updated_at)}</div>
            <Icon name="chevron" size={12} />
          </button>
        ))}
        {filtered.length === 0 && <div style={{ padding: "80px 0", textAlign: "center", color: "var(--fg-muted)", fontSize: 13 }}>No projects match.</div>}
      </main>
    </div>
  );
}

// ─── SeverityTag / PriorityTag ────────────────────────────────────────────────

function SeverityTag({ sev }: { sev: string }) {
  const c: Record<string, string> = { critical: "var(--bad)", high: "var(--bad)", med: "var(--warn)", low: "var(--fg-dim)" };
  return <span className="mono" style={{ fontSize: 9.5, color: c[sev] ?? "var(--fg-dim)", textTransform: "uppercase", letterSpacing: "0.1em", paddingTop: 3 }}>{sev}</span>;
}

function PriorityTag({ p }: { p: string }) {
  const c: Record<string, string> = { high: "var(--accent)", med: "var(--fg-muted)", low: "var(--fg-dim)" };
  return <span className="mono" style={{ fontSize: 9.5, color: c[p] ?? "var(--fg-dim)", textTransform: "uppercase", letterSpacing: "0.1em", paddingTop: 3 }}>{p}</span>;
}

// ─── OverviewTab ─────────────────────────────────────────────────────────────

function OverviewTab({ p }: { p: Project }) {
  const readiness = p.readiness ?? 0, completeness = p.completeness ?? 0, confidence = p.confidence ?? 0;
  return (
    <>
      <section style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 48, alignItems: "start", paddingBottom: 40, borderBottom: "1px solid var(--hairline)" }}>
        <div>
          <div className="kicker" style={{ marginBottom: 12 }}>What it is</div>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 26, lineHeight: 1.35, color: "var(--fg)", margin: "0 0 20px", maxWidth: 680 }}>{p.description ?? "No description."}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{(p.tech ?? []).map(t => <span key={t} className="mono" style={{ fontSize: 10.5, padding: "3px 8px", border: "1px solid var(--hairline)", color: "var(--fg-muted)", borderRadius: 3 }}>{t}</span>)}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <ReadinessDial value={readiness} size={180} />
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 14, fontSize: 11, color: "var(--fg-muted)" }}>
            <div><div className="mono" style={{ color: "var(--fg)" }}>{completeness}%</div><div className="kicker" style={{ marginTop: 2 }}>Complete</div></div>
            <div><div className="mono" style={{ color: "var(--fg)" }}>{confidence}%</div><div className="kicker" style={{ marginTop: 2 }}>Confidence</div></div>
          </div>
        </div>
      </section>
      <section style={{ padding: "36px 0", borderBottom: "1px solid var(--hairline)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><Icon name="map" size={13} /><div className="kicker">Where you left off</div>{p.scanned_at && <span style={{ fontSize: 11, color: "var(--fg-dim)" }}>AI scan, {timeAgo(p.scanned_at)} ago</span>}</div>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontStyle: "italic", lineHeight: 1.5, color: "var(--fg)", margin: 0, maxWidth: 780 }}>{p.where ?? p.description ?? "No context recorded yet. Run an AI scan to generate project intelligence."}</p>
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, padding: "36px 0", borderBottom: "1px solid var(--hairline)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}><div className="kicker">Blockers</div>{(p.blockers ?? []).length > 0 && <span className="mono" style={{ fontSize: 10, color: "var(--fg-dim)" }}>{(p.blockers ?? []).length}</span>}</div>
          {(p.blockers ?? []).length === 0 ? <div style={{ fontSize: 13, color: "var(--fg-muted)", fontStyle: "italic", paddingTop: 4 }}>None flagged. Keep going.</div>
            : <div style={{ borderTop: "1px solid var(--hairline)" }}>{(p.blockers ?? []).map((b, i) => (
              <div key={i} style={{ padding: "14px 0", borderBottom: "1px solid var(--hairline)", display: "grid", gridTemplateColumns: "auto 1fr", gap: 12 }}>
                <SeverityTag sev={b.sev} />
                <div><div style={{ fontSize: 13.5, color: "var(--fg)", marginBottom: 3 }}>{b.title}</div>{b.why && <div style={{ fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5 }}>{b.why}</div>}</div>
              </div>
            ))}</div>}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}><div className="kicker">Suggested next</div><span className="mono" style={{ fontSize: 10, color: "var(--fg-dim)" }}>{(p.tasks ?? []).length}</span></div>
          <div style={{ borderTop: "1px solid var(--hairline)" }}>{(p.tasks ?? []).map((t, i) => (
            <div key={i} style={{ padding: "14px 0", borderBottom: "1px solid var(--hairline)", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "start" }}>
              <button style={{ width: 14, height: 14, border: "1px solid var(--hairline-strong)", borderRadius: 2, marginTop: 2 }} />
              <div><div style={{ fontSize: 13.5, color: "var(--fg)", marginBottom: 3 }}>{t.title}</div>{t.why && <div style={{ fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5 }}>{t.why}</div>}</div>
              <PriorityTag p={t.p} />
            </div>
          ))}</div>
        </div>
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, padding: "36px 0" }}>
        <div>
          <div className="kicker" style={{ marginBottom: 14 }}>Readiness breakdown</div>
          <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 8 }}>
            {Object.entries(p.breakdown ?? {}).map(([k, v]) => <Bar key={k} label={k} value={v} />)}
            {Object.keys(p.breakdown ?? {}).length === 0 && <div style={{ padding: "12px 0", fontSize: 12, color: "var(--fg-muted)" }}>No breakdown data yet.</div>}
          </div>
        </div>
        <div>
          <div className="kicker" style={{ marginBottom: 14 }}>Recent progress</div>
          <div style={{ borderTop: "1px solid var(--hairline)" }}>
            {(p.progress ?? []).map((item, i) => <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid var(--hairline)", display: "grid", gridTemplateColumns: "16px 1fr", gap: 10, fontSize: 13, color: "var(--fg)" }}><Icon name="check" size={13} /><span>{item}</span></div>)}
            {(p.progress ?? []).length === 0 && <div style={{ padding: "12px 0", fontSize: 12, color: "var(--fg-muted)" }}>No progress recorded yet.</div>}
          </div>
        </div>
      </section>
    </>
  );
}

// ─── IntelTab ─────────────────────────────────────────────────────────────────

function IntelTab({ p }: { p: Project }) {
  const readiness = p.readiness ?? 0;
  const history = [
    { t: timeAgo(p.scanned_at ?? p.updated_at), r: readiness, note: "Current" },
    { t: "3d", r: Math.max(0, readiness - 5), note: "Before migration draft" },
    { t: "1w", r: Math.max(0, readiness - 12), note: "Pre-refactor" },
    { t: "2w", r: Math.max(0, readiness - 18), note: "Feature branch merge" },
    { t: "1mo", r: Math.max(0, readiness - 25), note: "Previous milestone" },
  ];
  return (
    <div>
      <section style={{ paddingBottom: 32, borderBottom: "1px solid var(--hairline)", marginBottom: 32 }}>
        <div className="kicker" style={{ marginBottom: 14 }}>Scan history</div>
        <div style={{ borderTop: "1px solid var(--hairline)" }}>
          {history.map((h, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--hairline)", alignItems: "center" }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--fg-dim)" }}>{h.t}</div>
              <div style={{ fontSize: 13, color: "var(--fg)" }}>{h.note}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "flex-end" }}><span className="num" style={{ fontSize: 20, color: "var(--fg)" }}>{h.r}</span><span className="mono" style={{ fontSize: 10, color: "var(--fg-dim)" }}>%</span></div>
            </div>
          ))}
        </div>
      </section>
      <div className="kicker" style={{ marginBottom: 14 }}>Stack detected</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 40 }}>
        {(p.tech ?? []).map(t => <span key={t} className="mono" style={{ fontSize: 11, padding: "4px 10px", border: "1px solid var(--hairline)", color: "var(--fg)", borderRadius: 3 }}>{t}</span>)}
        {(p.tech ?? []).length === 0 && <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>No tech detected yet.</div>}
      </div>
      <div className="kicker" style={{ marginBottom: 14 }}>Confidence composition</div>
      <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 8 }}>
        {Object.entries(p.breakdown ?? {}).map(([k, v]) => <Bar key={k} label={k} value={v} />)}
        {Object.keys(p.breakdown ?? {}).length === 0 && <div style={{ padding: "12px 0", fontSize: 12, color: "var(--fg-muted)" }}>Run an AI scan to populate.</div>}
      </div>
    </div>
  );
}

// ─── NoteEditor / NotesTab ────────────────────────────────────────────────────

function NoteEditor({ note }: { note: Note }) {
  return (
    <div style={{ padding: "28px 36px", overflow: "auto", maxHeight: 660 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span className="mono" style={{ fontSize: 10, color: "var(--fg-dim)", padding: "3px 8px", border: "1px solid var(--hairline)", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.1em" }}>{NOTE_META[note.type]?.label ?? note.type}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-dim)" }}>Updated {timeAgo(note.updated)} ago</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--good)", display: "flex", alignItems: "center", gap: 4 }}><Icon name="check" size={10} /> SYNCED</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button style={{ padding: "6px 10px", border: "1px solid var(--hairline)", borderRadius: 3, fontSize: 11, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 4 }}><Icon name="sparkle" size={10} /> Enhance</button>
          <button style={{ padding: "6px 10px", border: "1px solid var(--hairline)", borderRadius: 3, fontSize: 11, color: "var(--fg-muted)" }}><Icon name="pin" size={10} /></button>
        </div>
      </div>
      <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 34, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.15, color: "var(--fg)", margin: "0 0 20px" }}>{note.title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--fg)", maxWidth: 640 }}><p style={{ marginTop: 0 }}>{note.preview || "No content yet."}</p></div>
      <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--fg-dim)" }}>
        <span className="mono">.wired/notes/{note.id}.md</span><span>Markdown / auto-synced to repo</span>
      </div>
    </div>
  );
}

function NotesTab({ p, notes }: { p: Project; notes: Note[] }) {
  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(notes[0]?.id ?? null);
  const filtered = notes.filter(n => { if (filterType && n.type !== filterType) return false; if (q && !n.title.toLowerCase().includes(q.toLowerCase()) && !n.preview.toLowerCase().includes(q.toLowerCase())) return false; return true; });
  const note = filtered.find(n => n.id === selected) ?? filtered[0];
  const types = Array.from(new Set(notes.map(n => n.type)));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", border: "1px solid var(--hairline)", borderRadius: 6, overflow: "hidden", minHeight: 600 }}>
      <div style={{ borderRight: "1px solid var(--hairline)", background: "var(--panel)" }}>
        <div style={{ padding: 14, borderBottom: "1px solid var(--hairline)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", color: "var(--fg-dim)" }}><Icon name="search" size={12} /></div>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter notes"
                style={{ width: "100%", padding: "4px 4px 4px 18px", background: "transparent", border: "none", fontSize: 12, color: "var(--fg)", outline: "none" }} />
            </div>
            <button style={{ padding: "4px 8px", border: "1px solid var(--hairline)", borderRadius: 3, fontSize: 11, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 4 }}><Icon name="plus" size={10} /> New</button>
          </div>
          <div style={{ display: "flex", gap: 10, overflow: "auto", paddingBottom: 2 }}>
            <button onClick={() => setFilterType(null)} style={{ fontSize: 10.5, color: !filterType ? "var(--fg)" : "var(--fg-dim)", whiteSpace: "nowrap" as const }}>ALL</button>
            {types.map(t => <button key={t} onClick={() => setFilterType(t)} style={{ fontSize: 10.5, color: filterType === t ? "var(--fg)" : "var(--fg-dim)", whiteSpace: "nowrap" as const, textTransform: "uppercase" as const, letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>{NOTE_META[t]?.label ?? t}</button>)}
          </div>
        </div>
        <div style={{ maxHeight: 560, overflow: "auto" }}>
          {filtered.map(n => (
            <button key={n.id} onClick={() => setSelected(n.id)}
              style={{ display: "block", width: "100%", textAlign: "left" as const, padding: "12px 14px", borderBottom: "1px solid var(--hairline)", background: note?.id === n.id ? "var(--panel-2)" : "transparent", borderLeft: note?.id === n.id ? "2px solid var(--accent)" : "2px solid transparent" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span className="mono" style={{ fontSize: 9.5, color: "var(--fg-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{NOTE_META[n.type]?.label ?? n.type}</span>
                {n.pinned && <Icon name="pin" size={9} />}
                <span className="mono" style={{ fontSize: 9.5, color: "var(--fg-dim)", marginLeft: "auto" }}>{timeAgo(n.updated)}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--fg)", fontWeight: 500, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{n.title}</div>
              <div style={{ fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{n.preview}</div>
            </button>
          ))}
          {filtered.length === 0 && <div style={{ padding: "24px 14px", fontSize: 12, color: "var(--fg-muted)" }}>No notes match.</div>}
        </div>
      </div>
      {note ? <NoteEditor note={note} /> : <div style={{ padding: 40, color: "var(--fg-muted)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center" as const }}><div style={{ marginBottom: 8 }}><Icon name="file" size={24} /></div>No note selected.</div></div>}
    </div>
  );
}

// ─── ActivityTab ─────────────────────────────────────────────────────────────

function ActivityTab({ p }: { p: Project }) {
  const items = [
    { t: "2h", k: "commit", title: "Latest commit on " + (p.branch ?? "main"), hash: "a1f3c92" },
    { t: "4h", k: "scan", title: "AI scan / readiness " + (p.readiness ?? 0) + "%" },
    { t: "6h", k: "note", title: "Project context updated" },
    { t: "1d", k: "commit", title: "Working on " + (p.branch ?? "main"), hash: "47b9ee1" },
    { t: "1d", k: "sync", title: "Notes synced to .wired/notes/" },
    { t: "2d", k: "commit", title: "Feature work on " + (p.branch ?? "main"), hash: "2de8044" },
    { t: "3d", k: "scan", title: "AI scan completed" },
  ];
  const icon: Record<string, string> = { commit: "git", scan: "sparkle", note: "file", sync: "refresh" };
  return (
    <div>
      <div className="kicker" style={{ marginBottom: 14 }}>Timeline</div>
      <div style={{ borderTop: "1px solid var(--hairline)" }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "50px 22px 1fr 100px", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--hairline)", alignItems: "center" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-dim)" }}>{it.t}</div>
            <div style={{ color: "var(--fg-muted)" }}><Icon name={icon[it.k]} size={13} /></div>
            <div style={{ fontSize: 13, color: "var(--fg)" }}>{it.title}</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-dim)", textAlign: "right" as const }}>{it.hash ?? it.k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── InfoTab ──────────────────────────────────────────────────────────────────

function InfoTab({ p }: { p: Project }) {
  const rows: [string, React.ReactNode][] = [
    ["Status", <span style={{ display: "flex", alignItems: "center", gap: 6 }}><StatusDot status={p.status} /><span style={{ textTransform: "capitalize" }}>{p.status}</span></span>],
    ["Source", p.source_label ?? p.source_type ?? "—"],
    ["Default branch", p.branch ?? "main"],
    ["Tags", p.tags.length > 0 ? p.tags.map(t => "#" + t).join(", ") : "—"],
    ["Notes", (p.notes_count ?? 0) + " total"],
    ["Last updated", timeAgo(p.updated_at) + " ago"],
    ["AI scan", p.scanned_at ? timeAgo(p.scanned_at) + " ago" : "never"],
    ["Readiness", (p.readiness ?? 0) + "%"],
    ["Confidence", (p.confidence ?? 0) + "%"],
  ];
  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ borderTop: "1px solid var(--hairline)" }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--hairline)" }}>
            <div className="kicker">{k}</div>
            <div style={{ fontSize: 13, color: "var(--fg)" }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 40, display: "flex", gap: 8 }}>
        <button style={{ padding: "8px 14px", border: "1px solid var(--hairline)", borderRadius: 4, fontSize: 12, color: "var(--fg-muted)" }}>Open in finder</button>
        <button style={{ padding: "8px 14px", border: "1px solid var(--hairline)", borderRadius: 4, fontSize: 12, color: "var(--fg-muted)" }}>Edit project</button>
        <button style={{ padding: "8px 14px", border: "1px solid var(--hairline)", borderRadius: 4, fontSize: 12, color: "var(--bad)" }}>Archive</button>
      </div>
    </div>
  );
}

// ─── ProjectDashboard ─────────────────────────────────────────────────────────

function ProjectDashboard({ project: p, notes }: { project: Project; notes: Note[] }) {
  const [tab, setTab] = useState("overview");
  return (
    <div>
      <Topbar title={p.name}
        subtitle={<span style={{ display: "flex", gap: 10, alignItems: "center" }}><SourceIcon source={p.source_type} /><span className="mono" style={{ fontSize: 12 }}>{p.source_label ?? p.source_type}</span><span style={{ color: "var(--fg-dim)" }}>.</span><Icon name="git" size={11} /><span className="mono" style={{ fontSize: 12 }}>{p.branch ?? "main"}</span></span>}
        right={<div style={{ display: "flex", gap: 8 }}><button style={{ padding: "8px 12px", border: "1px solid var(--hairline)", borderRadius: 4, fontSize: 12, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="refresh" size={11} /> Local scan</button><button disabled title="This overview shell does not run scans directly." style={{ padding: "8px 14px", background: "var(--panel-2)", color: "var(--fg-dim)", borderRadius: 4, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, cursor: "not-allowed" }}><Icon name="sparkle" size={11} /> AI scan unavailable</button></div>} />
      <div style={{ display: "flex", gap: 0, padding: "0 40px", borderBottom: "1px solid var(--hairline)", background: "var(--bg)" }}>
        {([["overview","Overview"],["intel","Intelligence"],["notes","Notes",notes.length],["activity","Activity"],["info","Info"]] as [string,string,number?][]).map(([k, label, count]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "14px 16px 12px", fontSize: 12.5, color: tab === k ? "var(--fg)" : "var(--fg-muted)", borderBottom: tab === k ? "1px solid var(--fg)" : "1px solid transparent", marginBottom: -1, display: "flex", alignItems: "center", gap: 6 }}>{label}{count !== undefined && <span className="mono" style={{ fontSize: 10, color: "var(--fg-dim)" }}>{count}</span>}</button>
        ))}
      </div>
      <main style={{ padding: "32px 40px 100px", maxWidth: 1280 }}>
        {tab === "overview" && <OverviewTab p={p} />}
        {tab === "intel" && <IntelTab p={p} />}
        {tab === "notes" && <NotesTab p={p} notes={notes} />}
        {tab === "activity" && <ActivityTab p={p} />}
        {tab === "info" && <InfoTab p={p} />}
      </main>
    </div>
  );
}

// ─── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ on: init = false }: { on?: boolean }) {
  const [on, setOn] = useState(init);
  return (
    <button onClick={() => setOn(!on)} style={{ width: 32, height: 18, borderRadius: 10, background: on ? "var(--accent)" : "var(--hairline-strong)", position: "relative" as const, transition: "background .15s" }}>
      <span style={{ position: "absolute" as const, top: 2, left: on ? 16 : 2, width: 14, height: 14, background: "var(--bg)", borderRadius: "50%", transition: "left .15s" }} />
    </button>
  );
}

// ─── SettingsSection ───────────────────────────────────────────────────────────

function SettingsSection({ title, rows, footer }: { title: string; rows: [string, React.ReactNode][]; footer?: React.ReactNode }) {
  return (
    <div>
      <div className="kicker" style={{ marginBottom: 18 }}>{title}</div>
      <div style={{ borderTop: "1px solid var(--hairline)" }}>
        {rows.map(([k, v], i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 20, padding: "14px 0", borderBottom: "1px solid var(--hairline)", alignItems: "center" }}>
            <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>{k}</div>
            <div>{v}</div>
          </div>
        ))}
      </div>
      {footer}
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function Settings({ settings }: { settings: Settings | null }) {
  const [tab, setTab] = useState("general");
  const tabs: [string, string][] = [["general","General"],["ai","AI provider"],["sync","Sync & storage"],["integrations","Integrations"],["appearance","Appearance"]];
  const inputStyle: React.CSSProperties = { padding: "7px 10px", background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: 4, fontSize: 12.5, color: "var(--fg)", outline: "none", width: 280 };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const btnStyle: React.CSSProperties = { padding: "7px 12px", border: "1px solid var(--hairline)", borderRadius: 4, fontSize: 12, color: "var(--fg-muted)" };
  return (
    <div>
      <Topbar title="Settings" subtitle="Wired / local instance" />
      <main style={{ padding: "28px 40px 100px", maxWidth: 1000, display: "grid", gridTemplateColumns: "200px 1fr", gap: 48 }}>
        <nav>{tabs.map(([k, label]) => <button key={k} onClick={() => setTab(k)} style={{ display: "block", width: "100%", textAlign: "left" as const, padding: "8px 12px", fontSize: 13, color: tab === k ? "var(--fg)" : "var(--fg-muted)", background: tab === k ? "var(--panel-2)" : "transparent", borderRadius: 4, marginBottom: 2 }}>{label}</button>)}</nav>
        <div>
          {tab === "general" && <SettingsSection title="General" rows={[["Instance name",<input defaultValue={settings?.instance_name ?? "Wired / home"} style={inputStyle} />],["Default view",<select style={selectStyle}><option>Overview</option><option>Projects</option><option>Last visited</option></select>],["Timezone",<input defaultValue={settings?.timezone ?? "America/Chicago"} style={inputStyle} />],["Keyboard shortcuts",<button style={btnStyle}>View all</button>]]} />}
          {tab === "ai" && <SettingsSection title="AI provider" rows={[["Provider",<select style={selectStyle}><option>OpenAI-compatible</option><option>Anthropic</option><option>Local (Ollama)</option></select>],["Base URL",<input defaultValue="https://api.openai.com/v1" style={inputStyle} />],["API key",<input type="password" defaultValue="sk-***" style={inputStyle} />],["Model",<input defaultValue="gpt-4o-mini" style={inputStyle} />],["Max tokens / scan",<input defaultValue="8000" style={inputStyle} />]]} footer={<div style={{ marginTop: 16, fontSize: 12, color: "var(--fg-muted)" }}>Last successful call: 4m ago / Credits used this month: <span className="mono" style={{ color: "var(--fg)" }}>$3.12</span></div>} />}
          {tab === "sync" && <SettingsSection title="Sync & storage" rows={[["Database path",<span className="mono" style={{ fontSize: 12, color: "var(--fg-muted)" }}>~/.wired/data/wired.db</span>],["Notes folder",<span className="mono" style={{ fontSize: 12, color: "var(--fg-muted)" }}>&lt;project&gt;/.wired/notes/</span>],["Auto-sync",<Toggle on />],["Conflict behavior",<select style={selectStyle}><option>Prompt</option><option>Keep local</option><option>Keep remote</option></select>],["Backup",<button style={btnStyle}>Export .wired backup</button>]]} />}
          {tab === "integrations" && <SettingsSection title="Integrations" rows={[["GitHub",<span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--fg-muted)" }}><StatusDot status="active" /> Connected</span>],["Git (local)",<span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Detected</span>],["Editor protocol",<select style={selectStyle}><option>vscode://</option><option>cursor://</option><option>idea://</option></select>]]} />}
          {tab === "appearance" && <SettingsSection title="Appearance" rows={[["Theme",<span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Use the <span style={{ color: "var(--accent)" }}>Tweaks</span> panel to preview live.</span>],["Reduce motion",<Toggle />]]} />}
        </div>
      </main>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20, alignItems: "start" }}>
      <div><div style={{ fontSize: 13, color: "var(--fg)" }}>{label}</div>{hint && <div style={{ fontSize: 11.5, color: "var(--fg-dim)", marginTop: 2 }}>{hint}</div>}</div>
      <div>{children}</div>
    </div>
  );
}

// ─── NewProject ───────────────────────────────────────────────────────────────

function NewProject({ setRoute }: { setRoute: (r: Route) => void }) {
  const [source, setSource] = useState("github");
  const inputStyle: React.CSSProperties = { padding: "7px 10px", background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: 4, fontSize: 12.5, color: "var(--fg)", outline: "none", width: "100%" };
  const btnStyle: React.CSSProperties = { padding: "7px 12px", border: "1px solid var(--hairline)", borderRadius: 4, fontSize: 12, color: "var(--fg-muted)" };
  return (
    <div>
      <Topbar title="New project" subtitle="Add a source to scan and track" right={<button onClick={() => setRoute({ name: "home" })} style={{ fontSize: 12, color: "var(--fg-muted)" }}>Cancel</button>} />
      <main style={{ padding: "28px 40px 100px", maxWidth: 760 }}>
        <div className="kicker" style={{ marginBottom: 14 }}>Source</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 32 }}>
          {([["github","GitHub repo","git"],["local_folder","Local folder","folder"],["git_remote","Git remote","globe"],["manual","Manual entry","book"]] as [string,string,string][]).map(([k, label, icon]) => (
            <button key={k} onClick={() => setSource(k)} style={{ padding: "20px 16px", border: "1px solid", borderColor: source === k ? "var(--fg)" : "var(--hairline)", borderRadius: 4, textAlign: "left" as const, background: source === k ? "var(--panel-2)" : "transparent" }}>
              <Icon name={icon} size={16} /><div style={{ fontSize: 13, color: "var(--fg)", marginTop: 10, fontWeight: 500 }}>{label}</div>
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gap: 18, borderTop: "1px solid var(--hairline)", paddingTop: 24 }}>
          <Field label="Name" hint="How it appears in the sidebar."><input placeholder="Muscle" style={inputStyle} /></Field>
          <Field label="Description" hint="One short sentence."><input placeholder="Self-learning code review..." style={inputStyle} /></Field>
          {source === "github" && <Field label="Repository" hint="owner/repo"><input placeholder="owner/repo" style={inputStyle} /></Field>}
          {source === "local_folder" && <Field label="Path"><input placeholder="/Users/you/dev/project" style={inputStyle} /></Field>}
          <Field label="Tags" hint="Comma separated."><input placeholder="core, ai, cli" style={inputStyle} /></Field>
          <Field label="Run first AI scan"><Toggle on /></Field>
        </div>
        <div style={{ marginTop: 36, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => setRoute({ name: "home" })} style={btnStyle}>Cancel</button>
          <button onClick={() => setRoute({ name: "home" })} style={{ padding: "8px 18px", background: "var(--fg)", color: "var(--bg)", borderRadius: 4, fontSize: 12, fontWeight: 500 }}>Add project</button>
        </div>
      </main>
    </div>
  );
}

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

function ActivityFeed({ activity, projects }: { activity: Activity[]; projects: Project[] }) {
  const groups: Record<string, Activity[]> = {};
  for (const a of activity) { const key = new Date(a.t).toDateString(); (groups[key] ??= []).push(a); }
  return (
    <div>
      <Topbar title="Activity" subtitle="All events across projects" />
      <main style={{ padding: "28px 40px 100px", maxWidth: 1000 }}>
        {Object.entries(groups).map(([day, items]) => (
          <section key={day} style={{ marginBottom: 32 }}>
            <div className="kicker" style={{ marginBottom: 12 }}>{day}</div>
            <div style={{ borderTop: "1px solid var(--hairline)" }}>
              {items.map((a, i) => (
                <div key={i} style={{ padding: "14px 0", borderBottom: "1px solid var(--hairline)", display: "grid", gridTemplateColumns: "60px 100px 1fr 80px", gap: 16, alignItems: "center" }}>
                  <div className="mono" style={{ fontSize: 11, color: "var(--fg-dim)" }}>{new Date(a.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{a.who}</div>
                  <div style={{ fontSize: 13, color: "var(--fg)" }}>{a.verb} <span style={{ color: "var(--accent)" }}>{a.project}</span>{a.detail && <span style={{ color: "var(--fg-muted)" }}> / {a.detail}</span>}</div>
                  <div style={{ textAlign: "right" as const }}><Icon name="arrowUpRight" size={12} /></div>
                </div>
              ))}
            </div>
          </section>
        ))}
        {Object.keys(groups).length === 0 && <div style={{ padding: "80px 0", textAlign: "center", color: "var(--fg-muted)", fontSize: 13 }}>No activity yet.</div>}
      </main>
    </div>
  );
}

// ─── TweaksPanel ─────────────────────────────────────────────────────────────

function TweaksPanel({ open, setOpen, state, setState }: {
  open: boolean; setOpen: (v: boolean) => void;
  state: { theme: Theme; accent: Accent; density: Density };
  setState: (s: { theme: Theme; accent: Accent; density: Density }) => void;
}) {
  const themes: Theme[] = ["ink", "paper", "slate"];
  const accents: [Accent, string][] = [["amber","#d99a3f"],["electric","#6c8cff"],["lime","#b8d46a"],["rose","#d78aa8"],["graphite","#c6c6cc"]];
  const densities: Density[] = ["tight", "regular", "roomy"];
  const save = (key: keyof typeof state, val: string) => setState({ ...state, [key]: val });
  return (
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 100, background: "var(--panel)", border: "1px solid var(--hairline-strong)", borderRadius: 10, padding: 14, width: 280, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", display: open ? "block" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h4 style={{ margin: 0, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-dim)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>Tweaks</h4>
        <button onClick={() => setOpen(false)} style={{ color: "var(--fg-muted)" }}><Icon name="x" size={12} /></button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <h4 style={{ margin: "0 0 10px", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-dim)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>Theme</h4>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{themes.map(t => <button key={t} onClick={() => save("theme", t)} style={{ padding: "6px 10px", fontSize: 12, border: "1px solid var(--hairline)", borderRadius: 4, color: state.theme === t ? "var(--bg)" : "var(--fg-muted)", background: state.theme === t ? "var(--fg)" : "transparent", textTransform: "capitalize" as const }}>{t}</button>)}</div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <h4 style={{ margin: "0 0 10px", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-dim)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>Accent</h4>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{accents.map(([n, c]) => <button key={n} onClick={() => save("accent", n)} style={{ padding: "6px 10px", fontSize: 12, border: "1px solid var(--hairline)", borderRadius: 4, color: state.accent === n ? "var(--bg)" : "var(--fg-muted)", background: state.accent === n ? "var(--fg)" : "transparent" }}><span style={{ width: 14, height: 14, borderRadius: "50%", display: "inline-block", verticalAlign: "middle", marginRight: 4, border: "1px solid rgba(0,0,0,0.1)", background: c }} />{n}</button>)}</div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <h4 style={{ margin: "0 0 10px", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-dim)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>Density</h4>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{densities.map(d => <button key={d} onClick={() => save("density", d)} style={{ padding: "6px 10px", fontSize: 12, border: "1px solid var(--hairline)", borderRadius: 4, color: state.density === d ? "var(--bg)" : "var(--fg-muted)", background: state.density === d ? "var(--fg)" : "transparent", textTransform: "capitalize" as const }}>{d}</button>)}</div>
      </div>
      <div style={{ fontSize: 10.5, color: "var(--fg-dim)", marginTop: 6, lineHeight: 1.5 }}>Tweaks persist to disk so reloads keep your theme.</div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "wired-ui-prefs";

function loadPrefs(): { theme: Theme; accent: Accent; density: Density } {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {}
  return { theme: "ink", accent: "amber", density: "tight" };
}

function savePrefs(prefs: { theme: Theme; accent: Accent; density: Density }) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
}

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [projects, setProjects] = useState<Project[]>([]);
  const [notesByProject, setNotesByProject] = useState<Record<string, Note[]>>({});
  const [activity, setActivity] = useState<Activity[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prefs, setPrefs] = useState<{ theme: Theme; accent: Accent; density: Density }>(loadPrefs);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  useEffect(() => {
    document.body.setAttribute("data-theme", prefs.theme);
    document.body.setAttribute("data-accent", prefs.accent);
    document.body.setAttribute("data-density", prefs.density);
    savePrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    async function load() {
      try {
        const [projectsRes, settingsRes] = await Promise.all([fetch("/api/projects"), fetch("/api/settings")]);
        if (projectsRes.ok) {
          const data = await projectsRes.json();
          const raw: RawProject[] = Array.isArray(data) ? data : (data.projects ?? []);
          const projs = raw.map(normalizeProject);
          setProjects(projs);
          const needs = projs.filter(p => p.pinned || p.status === "active");
          await Promise.allSettled(
            needs.slice(0, 12).map(async (p) => {
              try {
                const r = await fetch("/api/projects/" + p.id + "/notes");
                if (r.ok) {
                  const rawNotes: RawNote[] = await r.json();
                  setNotesByProject(prev => ({ ...prev, [p.id]: rawNotes.map(normalizeNote) }));
                }
              } catch {}
            })
          );
        }
        if (settingsRes.ok) setSettings(await settingsRes.json());
      } catch (e) { console.error("Failed to load Wired data", e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") e.preventDefault(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const setRouteAndClose = useCallback((r: Route) => { setRoute(r); setMobileMenuOpen(false); }, []);

  const project = route.name === "project" ? projects.find(p => p.id === route.id) : null;
  const projectNotes = project ? (notesByProject[project.id] ?? []) : [];

  const enrichedProject = useMemo(() => {
    if (!project) return null;
    return {
      ...project,
      readiness: project.readiness ?? 0,
      completeness: project.completeness ?? 0,
      confidence: project.confidence ?? 0,
    };
  }, [project]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)", color: "var(--fg-muted)", fontFamily: "var(--font-sans)" }}>
        <div style={{ textAlign: "center" as const }}>
          <div style={{ marginBottom: 12, opacity: 0.5 }}><Icon name="zap" size={24} /></div>
          <div style={{ fontSize: 13 }}>Loading Wired...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", background: "var(--bg)" }}>
      <div style={{ flexShrink: 0 }} className="desktop-sidebar">
        <Sidebar route={route} setRoute={setRouteAndClose} projects={projects} />
      </div>

      <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} route={route} setRoute={setRouteAndClose} projects={projects} />

      <div style={{ flex: 1, overflow: "auto", background: "var(--bg)", position: "relative" as const }}>
        <div className="mobile-topbar" style={{ display: "none", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--hairline)", background: "var(--bg)", position: "sticky" as const, top: 0, zIndex: 10 }}>
          <button onClick={() => setMobileMenuOpen(true)} style={{ color: "var(--fg)" as const }}><Icon name="menu" size={20} /></button>
          <Wordmark size={16} />
        </div>

        {route.name === "home" && <Home projects={projects} activity={activity} setRoute={setRoute} />}
        {route.name === "projects" && <ProjectsList projects={projects} setRoute={setRoute} />}
        {route.name === "project" && enrichedProject && <ProjectDashboard project={enrichedProject} notes={projectNotes} />}
        {route.name === "activity" && <ActivityFeed activity={activity} projects={projects} />}
        {route.name === "settings" && <Settings settings={settings} />}
        {route.name === "new" && <NewProject setRoute={setRoute} />}
      </div>

      <BottomNav route={route} setRoute={setRoute} />
      <TweaksPanel open={tweaksOpen} setOpen={setTweaksOpen} state={prefs} setState={setPrefs} />

      {!tweaksOpen && (
        <button onClick={() => setTweaksOpen(true)} className="tweaks-trigger"
          style={{ position: "fixed", right: 16, bottom: 16, padding: "8px 12px", background: "var(--panel)", border: "1px solid var(--hairline-strong)", borderRadius: 20, fontSize: 11, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6, zIndex: 90 }}>
          <Icon name="settings" size={11} /> Tweaks
        </button>
      )}

      <style dangerouslySetInnerHTML={{ __html: `@media (max-width: 768px) {
  .desktop-sidebar { display: none !important; }
  .mobile-topbar { display: flex !important; }
  .tweaks-trigger { bottom: 80px !important; }
  body { overflow: auto !important; }
  #root { height: auto !important; overflow: auto !important; }
}
@media (min-width: 769px) {
  .mobile-topbar { display: none !important; }
}` }} />
    </div>
  );
}
