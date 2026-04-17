"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
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

const STATUS_OPTIONS = ["draft", "enhanced", "approved", "synced", "archived"];
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", enhanced: "Enhanced", approved: "Approved", synced: "Synced", archived: "Archived",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "#a0a0a0", enhanced: "#06b6d4", approved: "#4ade80", synced: "#22c55e", archived: "#6b7280",
};

const ENHANCEMENT_MODES = [
  { value: "clean_up", label: "Clean up", desc: "Fix grammar & formatting" },
  { value: "expand", label: "Expand", desc: "Detailed implementation note" },
  { value: "task_list", label: "Task list", desc: "Convert to checkbox tasks" },
  { value: "decision", label: "ADR", desc: "Architecture decision record" },
  { value: "github_issue", label: "GitHub issue", desc: "Draft issue with labels" },
  { value: "docs_section", label: "Docs section", desc: "README/docs format" },
  { value: "organize", label: "Organize", desc: "Structure a brainstorm" },
  { value: "summarize", label: "Summarize", desc: "Concise bullet points" },
  { value: "handoff", label: "Handoff", desc: "Developer handoff doc" },
  { value: "action_items", label: "Action items", desc: "Extract tasks & questions" },
];

interface Note {
  id: string;
  project_id: string;
  title: string;
  body_markdown: string;
  enhanced_body_markdown?: string | null;
  note_type: string;
  tags: string;
  status: string;
  pinned: boolean;
  synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export default function NoteEditorPage({ params }: { params: Promise<{ id: string; noteId: string }> }) {
  const { id: projectId, noteId } = use(params);
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [noteType, setNoteType] = useState("quick_note");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("draft");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEnhance, setShowEnhance] = useState(false);
  const [enhanceMode, setEnhanceMode] = useState("clean_up");
  const [enhancedContent, setEnhancedContent] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceWarning, setEnhanceWarning] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const s = (v: Record<string, string | number | undefined>) => v as React.CSSProperties;

  useEffect(() => {
    fetch(`/api/notes/${noteId}`)
      .then((r) => r.json())
      .then((n: Note) => {
        setNote(n);
        setTitle(n.title);
        setBody(n.body_markdown);
        setNoteType(n.note_type);
        setTags((JSON.parse(n.tags || "[]") as string[]).join(", "));
        setStatus(n.status);
        setPinned(n.pinned);
        document.title = `${n.title} — Wired`;
      })
      .catch(() => router.push(`/projects/${projectId}/notes`));
  }, [noteId]);

  const saveNote = useCallback(async (overrides?: Partial<Note>) => {
    if (!note) return;
    setSaving(true);
    try {
      const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bodyMarkdown: body, noteType, tags: parsedTags, status, pinned, ...overrides }),
      });
      if (res.ok) {
        const updated = await res.json();
        setNote(updated);
        setSavedAt(new Date().toISOString());
      }
    } catch {
      console.error("Save failed");
    } finally {
      setSaving(false);
    }
  }, [noteId, title, body, noteType, tags, status, pinned, note]);

  // Debounced autosave
  useEffect(() => {
    if (!note) return;
    if (
      title === note.title && body === note.body_markdown &&
      noteType === note.note_type && status === note.status && pinned === note.pinned
    ) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNote(), 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [title, body, noteType, status, pinned]);

  async function handleEnhance() {
    setEnhancing(true);
    setEnhanceWarning(null);
    setEnhancedContent(null);
    try {
      const res = await fetch(`/api/notes/${noteId}/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: enhanceMode }),
      });
      const data = await res.json();
      if (data.warning) setEnhanceWarning(data.warning);
      if (data.enhanced) setEnhancedContent(data.enhanced);
      else if (data.error) setEnhanceWarning(data.error);
    } catch {
      setEnhanceWarning("Enhancement failed. Check your AI configuration.");
    } finally {
      setEnhancing(false);
    }
  }

  function useEnhanced() {
    if (!enhancedContent) return;
    setBody(enhancedContent);
    saveNote({ bodyMarkdown: enhancedContent, enhancedBodyMarkdown: enhancedContent, status: "enhanced" });
    setEnhancedContent(null);
    setShowEnhance(false);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/notes/${noteId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) setSyncError(data.error || "Sync failed");
      else {
        const noteRes = await fetch(`/api/notes/${noteId}`);
        if (noteRes.ok) setNote(await noteRes.json());
      }
    } catch {
      setSyncError("Sync failed — check network and project path.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      router.push(`/projects/${projectId}/notes`);
    } catch {
      setDeleting(false);
    }
  }

  function renderPreview(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("### ")) return <h3 key={i} style={s({ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", margin: "16px 0 6px" })}>{line.slice(4)}</h3>;
      if (line.startsWith("## ")) return <h2 key={i} style={s({ fontSize: "17px", fontWeight: "600", color: "var(--text-primary)", margin: "18px 0 8px" })}>{line.slice(3)}</h2>;
      if (line.startsWith("# ")) return <h1 key={i} style={s({ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", margin: "20px 0 10px" })}>{line.slice(2)}</h1>;
      if (line.startsWith("- ")) return <li key={i} style={s({ fontSize: "13px", color: "var(--text-secondary)", marginLeft: "16px" })}>{renderInline(line.slice(2))}</li>;
      if (line.startsWith("> ")) return <blockquote key={i} style={s({ borderLeft: "3px solid var(--border)", paddingLeft: "12px", color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic", margin: "8px 0" })}>{renderInline(line.slice(2))}</blockquote>;
      if (line.match(/^\d+\. /)) return <li key={i} style={s({ fontSize: "13px", color: "var(--text-secondary)", marginLeft: "16px" })}>{renderInline(line.replace(/^\d+\. /, ""))}</li>;
      if (!line.trim()) return <br key={i} />;
      return <p key={i} style={s({ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0" })}>{renderInline(line)}</p>;
    });
  }

  function renderInline(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~|\[([^\]]+)\]\([^)]+\))/)
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} style={s({ fontWeight: "600", color: "var(--text-primary)" })}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
      if (part.startsWith("`") && part.endsWith("`")) return <code key={i} style={s({ background: "var(--bg-tertiary)", padding: "1px 5px", borderRadius: "4px", fontSize: "12px", fontFamily: "ui-monospace" })}>{part.slice(1, -1)}</code>;
      const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) return <a key={i} href={linkMatch[2]} style={s({ color: "#06b6d4", textDecoration: "underline" })}>{linkMatch[1]}</a>;
      if (!part) return null;
      return <span key={i}>{part}</span>;
    });
  }

  if (!note) {
    return (
      <div style={s({ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" })}>
        <p style={s({ color: "var(--text-muted)", fontSize: "13px" })}>Loading note…</p>
      </div>
    );
  }

  return (
    <div style={s({ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" })}>
      {/* Header */}
      <header style={s({ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" })}>
        <div style={s({ maxWidth: "800px", margin: "0 auto", padding: "0 16px", height: "52px", display: "flex", alignItems: "center", gap: "10px" })}>
          <Link href={`/projects/${projectId}/notes`} style={s({ color: "var(--text-secondary)", textDecoration: "none", display: "flex", alignItems: "center" })}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <div style={s({ flex: 1, display: "flex", alignItems: "center", gap: "10px", minWidth: 0 })}>
            <span style={s({ width: "7px", height: "7px", borderRadius: "50%", background: STATUS_COLORS[status] || "#a0a0a0", flexShrink: 0, display: "inline-block" })} />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={s({ flex: 1, background: "transparent", border: "none", fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", outline: "none", minWidth: 0 })}
              placeholder="Note title…"
            />
          </div>
          <span style={s({ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 })}>
            {saving ? "Saving…" : savedAt ? "Saved" : ""}
          </span>
          <div style={s({ display: "flex", gap: "6px", flexShrink: 0 })}>
            <button onClick={() => setShowPreview(!showPreview)} style={s({ background: showPreview ? "var(--bg-tertiary)" : "transparent", border: "1px solid var(--border)", borderRadius: "6px", padding: "5px 8px", cursor: "pointer", color: "var(--text-secondary)", fontSize: "11px" })}>
              {showPreview ? "Edit" : "Preview"}
            </button>
            <button onClick={() => setShowEnhance(true)} style={s({ background: "transparent", border: "1px solid var(--border)", borderRadius: "6px", padding: "5px 8px", cursor: "pointer", color: "var(--text-secondary)", fontSize: "11px" })}>
              ✨ Enhance
            </button>
            <button onClick={handleSync} disabled={syncing} style={s({ background: "transparent", border: "1px solid var(--border)", borderRadius: "6px", padding: "5px 8px", cursor: "pointer", color: syncing ? "var(--text-muted)" : "#4ade80", fontSize: "11px" })}>
              {syncing ? "…" : "↗ Sync"}
            </button>
            <button onClick={() => saveNote()} disabled={saving} style={s({ background: "var(--text-primary)", border: "none", borderRadius: "6px", padding: "5px 12px", cursor: "pointer", color: "var(--bg-primary)", fontSize: "11px", fontWeight: "500" })}>
              {saving ? "…" : "Save"}
            </button>
          </div>
        </div>
      </header>

      {/* Sync error */}
      {syncError && (
        <div style={s({ maxWidth: "800px", margin: "8px auto 0", padding: "0 16px" })}>
          <div style={s({ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#dc2626" })}>
            {syncError}
          </div>
        </div>
      )}

      {/* Body */}
      <div style={s({ flex: 1, maxWidth: "800px", margin: "0 auto", width: "100%", padding: "16px", boxSizing: "border-box" })}>
        {showPreview ? (
          <div style={s({ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", minHeight: "400px" })}>
            <h1 style={s({ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 16px" })}>{title || "Untitled"}</h1>
            {renderPreview(body)}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Start writing… (Markdown supported)"
            style={s({
              width: "100%", minHeight: "400px", background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: "12px", padding: "16px", fontSize: "14px",
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              color: "var(--text-primary)", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: "1.6",
            })}
          />
        )}
      </div>

      {/* Bottom toolbar */}
      <div style={s({ borderTop: "1px solid var(--border)", background: "var(--bg-primary)", position: "sticky", bottom: 0 })}>
        <div style={s({ maxWidth: "800px", margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" })}>
          <select value={noteType} onChange={(e) => { setNoteType(e.target.value); saveNote({ noteType: e.target.value }); }} style={s({ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", color: "var(--text-secondary)", cursor: "pointer", outline: "none" })}>
            {NOTE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            onBlur={() => { const p = tags.split(",").map((t) => t.trim()).filter(Boolean); saveNote({ tags: p }); }}
            placeholder="Tags: design, api…"
            style={s({ flex: 1, minWidth: "140px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", color: "var(--text-primary)", outline: "none" })}
          />
          <select value={status} onChange={(e) => { setStatus(e.target.value); saveNote({ status: e.target.value }); }} style={s({ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", cursor: "pointer", outline: "none" })}>
            {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{STATUS_LABELS[opt]}</option>)}
          </select>
          <button onClick={() => { setPinned(!pinned); saveNote({ pinned: !pinned }); }} style={s({ background: "transparent", border: "none", cursor: "pointer", fontSize: "12px", color: pinned ? "#f59e0b" : "var(--text-muted)" })}>
            {pinned ? "📌 Pinned" : "○ Pin"}
          </button>
          {note.synced_at && <span style={s({ fontSize: "11px", color: "#4ade80" })}>✓ Synced {new Date(note.synced_at).toLocaleDateString()}</span>}
          <button onClick={handleDelete} disabled={deleting} style={s({ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", fontSize: "12px", color: "#ef4444", opacity: deleting ? 0.5 : 1 })}>
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </div>

      {/* Enhancement Modal */}
      {showEnhance && (
        <div style={s({ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" })} onClick={(e) => { if (e.target === e.currentTarget) setShowEnhance(false); }}>
          <div style={s({ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", maxWidth: "560px", width: "100%", maxHeight: "90vh", overflowY: "auto" })}>
            <div style={s({ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" })}>
              <h2 style={s({ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 })}>Enhance with AI ✨</h2>
              <button onClick={() => setShowEnhance(false)} style={s({ background: "transparent", border: "none", cursor: "pointer", fontSize: "18px", color: "var(--text-muted)" })}>×</button>
            </div>
            <div style={s({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "16px" })}>
              {ENHANCEMENT_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setEnhanceMode(mode.value)}
                  style={s({
                    padding: "8px 10px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", textAlign: "left",
                    border: enhanceMode === mode.value ? "1px solid #06b6d4" : "1px solid var(--border)",
                    background: enhanceMode === mode.value ? "#06b6d410" : "transparent",
                    color: enhanceMode === mode.value ? "#06b6d4" : "var(--text-secondary)",
                  })}
                >
                  <div style={s({ fontWeight: "600" })}>{mode.label}</div>
                  <div style={s({ fontSize: "10px", opacity: 0.7, marginTop: "1px" })}>{mode.desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={handleEnhance}
              disabled={enhancing}
              style={s({ width: "100%", padding: "10px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", cursor: "pointer", border: "none", background: "#06b6d4", color: "#fff", opacity: enhancing ? 0.7 : 1, marginBottom: "12px" })}
            >
              {enhancing ? "Enhancing…" : `Enhance — ${ENHANCEMENT_MODES.find((m) => m.value === enhanceMode)?.label}`}
            </button>
            {enhanceWarning && (
              <p style={s({ fontSize: "12px", color: "#f59e0b", background: "#fef3c7", borderRadius: "8px", padding: "8px 12px", marginBottom: "12px" })}>{enhanceWarning}</p>
            )}
            {enhancedContent && (
              <div>
                <p style={s({ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" })}>Enhanced result:</p>
                <div style={s({ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px", maxHeight: "300px", overflowY: "auto", marginBottom: "10px" })}>
                  <pre style={s({ whiteSpace: "pre-wrap", fontSize: "12px", color: "var(--text-secondary)", margin: 0, fontFamily: "inherit" })}>{enhancedContent}</pre>
                </div>
                <div style={s({ display: "flex", gap: "8px" })}>
                  <button onClick={useEnhanced} style={s({ flex: 1, padding: "8px", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer", border: "none", background: "#4ade80", color: "#000" })}>Use Enhanced Version</button>
                  <button onClick={() => setEnhancedContent(null)} style={s({ padding: "8px 14px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)" })}>Discard</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
