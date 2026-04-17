"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NOTE_TYPES = [
  { value: "quick_note", label: "Quick Note" },
  { value: "idea", label: "Idea" },
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "decision", label: "Decision" },
  { value: "research", label: "Research" },
  { value: "task", label: "Task" },
  { value: "meeting_note", label: "Meeting Note" },
  { value: "architecture_note", label: "Architecture" },
  { value: "prompt", label: "Prompt" },
  { value: "scratchpad", label: "Scratchpad" },
];

const TYPE_ICONS: Record<string, string> = {
  quick_note: "📝", idea: "💡", bug: "🐛", feature: "✨",
  decision: "📋", research: "🔬", task: "✅", meeting_note: "📅",
  architecture_note: "🏗️", prompt: "🤖", scratchpad: "📓",
};

interface Note {
  id: string;
  title: string;
  body_markdown: string;
  note_type: string;
  tags: string;
  status: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  source_type: string;
}

export default function ProjectNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("quick_note");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [creating, setCreating] = useState(false);

  const s = (v: Record<string, string | number | undefined>) => v as React.CSSProperties;

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((p) => {
        setProject(p);
        document.title = `${p.name} — Notes — Wired`;
      })
      .catch(() => router.push("/projects"));
    fetchNotes();
  }, [id]);

  async function fetchNotes() {
    try {
      const res = await fetch(`/api/projects/${id}/notes`);
      const data = await res.json();
      setNotes(data);
    } catch {
      console.error("Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  }

  async function createNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), noteType: newType }),
      });
      if (res.ok) {
        const note = await res.json();
        router.push(`/projects/${id}/notes/${note.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteNote(noteId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    fetchNotes();
  }

  async function togglePin(note: Note, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !note.pinned }),
    });
    fetchNotes();
  }

  const filtered = notes.filter((n) => {
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.body_markdown.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && n.note_type !== filterType) return false;
    return true;
  });

  const pinned = filtered.filter((n) => n.pinned);
  const unpinned = filtered.filter((n) => !n.pinned);

  return (
    <div style={s({ minHeight: "100vh", background: "var(--bg-primary)" })}>
      {/* Header */}
      <header style={s({ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" })}>
        <div style={s({ maxWidth: "640px", margin: "0 auto", padding: "0 16px", height: "56px", display: "flex", alignItems: "center", gap: "12px" })}>
          <Link href={`/projects/${id}`} style={s({ color: "var(--text-secondary)", textDecoration: "none", display: "flex", alignItems: "center" })}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <div style={s({ flex: 1, minWidth: 0 })}>
            <h1 style={s({ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>
              {project?.name || "…"}
            </h1>
            <p style={s({ fontSize: "11px", color: "var(--text-muted)", margin: 0 })}>Notes</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            style={s({ background: "var(--text-primary)", color: "var(--bg-primary)", border: "none", borderRadius: "8px", padding: "7px 14px", fontSize: "13px", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" })}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            New
          </button>
        </div>
      </header>

      <div style={s({ maxWidth: "640px", margin: "0 auto", padding: "16px" })}>
        {/* Search + Filter */}
        <div style={s({ display: "flex", gap: "8px", marginBottom: "16px" })}>
          <div style={s({ flex: 1, position: "relative" })}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s({ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" })}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              placeholder="Search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={s({ width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 10px 8px 32px", fontSize: "13px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" })}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={s({ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer", outline: "none" })}
          >
            <option value="">All types</option>
            {NOTE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* New Note Modal */}
        {showNew && (
          <form onSubmit={createNote} style={s({ marginBottom: "20px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" })}>
            <input
              autoFocus
              type="text"
              placeholder="Note title…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={s({ width: "100%", background: "transparent", border: "none", fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", outline: "none", marginBottom: "12px" })}
            />
            <div style={s({ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" })}>
              {NOTE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setNewType(t.value)}
                  style={s({
                    padding: "4px 10px", borderRadius: "20px", fontSize: "11px", cursor: "pointer",
                    border: newType === t.value ? "1px solid var(--text-primary)" : "1px solid var(--border)",
                    background: newType === t.value ? "var(--text-primary)" : "transparent",
                    color: newType === t.value ? "var(--bg-primary)" : "var(--text-secondary)",
                  })}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div style={s({ display: "flex", gap: "8px", justifyContent: "flex-end" })}>
              <button type="button" onClick={() => setShowNew(false)} style={s({ padding: "7px 14px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)" })}>Cancel</button>
              <button type="submit" disabled={!newTitle.trim() || creating} style={s({ padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer", border: "none", background: "var(--text-primary)", color: "var(--bg-primary)", opacity: !newTitle.trim() || creating ? 0.5 : 1 })}>
                {creating ? "Creating…" : "Create Note"}
              </button>
            </div>
          </form>
        )}

        {loading && <p style={s({ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "40px 0" })}>Loading notes…</p>}

        {!loading && pinned.length > 0 && (
          <div style={s({ marginBottom: "20px" })}>
            <p style={s({ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" })}>Pinned</p>
            {pinned.map((note) => (
              <NoteCard key={note.id} note={note} projectId={id} onDelete={deleteNote} onTogglePin={togglePin} />
            ))}
          </div>
        )}

        {!loading && unpinned.map((note) => (
          <NoteCard key={note.id} note={note} projectId={id} onDelete={deleteNote} onTogglePin={togglePin} />
        ))}

        {!loading && filtered.length === 0 && (
          <div style={s({ textAlign: "center", padding: "48px 0" })}>
            <p style={s({ fontSize: "14px", color: "var(--text-muted)", margin: "0 0 12px" })}>
              {search || filterType ? "No notes match your search." : "No notes yet."}
            </p>
            {!search && !filterType && (
              <button onClick={() => setShowNew(true)} style={s({ background: "transparent", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", cursor: "pointer", color: "var(--text-secondary)" })}>
                Create your first note
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({
  note, projectId, onDelete, onTogglePin,
}: {
  note: Note;
  projectId: string;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onTogglePin: (note: Note, e: React.MouseEvent) => void;
}) {
  const tags = JSON.parse(note.tags || "[]") as string[];
  const preview = note.body_markdown.replace(/[#*`_~\[\]]/g, "").slice(0, 100);
  const s = (v: Record<string, string | number | undefined>) => v as React.CSSProperties;

  return (
    <Link href={`/projects/${projectId}/notes/${note.id}`} style={s({ display: "block", textDecoration: "none", marginBottom: "8px" })}>
      <div
        style={s({ padding: "14px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", transition: "border-color 0.15s" })}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--text-muted)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
      >
        <div style={s({ display: "flex", alignItems: "flex-start", gap: "10px" })}>
          <span style={s({ fontSize: "16px", marginTop: "1px", flexShrink: 0 })}>{TYPE_ICONS[note.note_type] || "📝"}</span>
          <div style={s({ flex: 1, minWidth: 0 })}>
            <div style={s({ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" })}>
              <span style={s({ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" })}>{note.title}</span>
              {note.pinned && <span style={s({ fontSize: "10px" })}>📌</span>}
              {note.status === "synced" && <span style={s({ fontSize: "10px", color: "#4ade80" })}>✓</span>}
            </div>
            {preview && <p style={s({ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>{preview}</p>}
            <div style={s({ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const })}>
              <span style={s({ fontSize: "10px", color: "var(--text-muted)", background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: "4px" })}>
                {NOTE_TYPES.find((t) => t.value === note.note_type)?.label || note.note_type}
              </span>
              {tags.slice(0, 2).map((tag) => (
                <span key={tag} style={s({ fontSize: "10px", color: "var(--text-muted)", background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: "4px" })}>{tag}</span>
              ))}
              <span style={s({ fontSize: "10px", color: "var(--text-muted)", marginLeft: "auto" })}>
                {new Date(note.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div style={s({ display: "flex", gap: "4px", flexShrink: 0 })}>
            <button
              onClick={(e) => onTogglePin(note, e)}
              style={s({ background: "transparent", border: "none", cursor: "pointer", fontSize: "12px", padding: "4px", opacity: note.pinned ? 1 : 0.4 })}
            >
              📌
            </button>
            <button
              onClick={(e) => onDelete(note.id, e)}
              style={s({ background: "transparent", border: "none", cursor: "pointer", fontSize: "14px", padding: "4px", opacity: 0.4, lineHeight: 1 })}
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
