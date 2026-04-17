"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderGit2, Globe, Folder, BookOpen, Check, Loader2 } from "lucide-react";

type SourceType = "local_folder" | "github" | "git_remote" | "manual";

const css = {
  bgPrimary: "#ffffff", bgSecondary: "#fafafa", bgTertiary: "#f5f5f5",
  bgCard: "#ffffff", border: "#e5e5e5",
  textPrimary: "#1a1a1a", textSecondary: "#6b6b6b", textMuted: "#a0a0a0",
};
const s = (v: Record<string, string>) => v as any;

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<"type" | "details">("type");
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [name, setName] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const sourceOptions: { type: SourceType; icon: typeof Folder; label: string; desc: string }[] = [
    { type: "local_folder", icon: Folder, label: "Local folder", desc: "Browse or enter a path on this server" },
    { type: "github", icon: FolderGit2, label: "GitHub repository", desc: "Enter a GitHub URL or owner/repo" },
    { type: "git_remote", icon: Globe, label: "Generic Git remote", desc: "Any Git repository with a remote URL" },
    { type: "manual", icon: BookOpen, label: "Manual project", desc: "Create without a repo or folder" },
  ];

  async function handleSubmit() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 64), description: description.trim() || null, sourceType, localPath: sourceType === "local_folder" ? localPath : null, remoteUrl: sourceType === "git_remote" ? githubUrl : null, githubOwner: sourceType === "github" ? (githubUrl.match(/github\.com[/:]([^/]+)/)?.[1] || "") : null, githubRepo: sourceType === "github" ? (githubUrl.match(/github\.com[/:]([^/]+)\/([^/\s]+)/)?.[2]?.replace(/\.git$/, "") || "") : null, tags: tags.split(",").map(t => t.trim()).filter(Boolean), status: "active" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch (e: any) {
      setError(e.message || "Failed to create project");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={s({ "--bg-primary": css.bgPrimary, "--bg-secondary": css.bgSecondary, "--bg-tertiary": css.bgTertiary, "--bg-card": css.bgCard, "--border": css.border, "--text-primary": css.textPrimary, "--text-secondary": css.textSecondary, "--text-muted": css.textMuted })}>
      <header className="border-b sticky top-0 z-50 bg-white/80 backdrop-blur-sm" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/projects" className="p-2 -ml-2 rounded-lg hover:bg-zinc-100"><ArrowLeft size={16} style={{ color: "var(--text-muted)" }} /></Link>
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Add project</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        {step === "type" && (
          <div>
            <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>How do you want to add this project?</h1>
            <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Choose the source type for your project.</p>
            <div className="grid gap-3">
              {sourceOptions.map(opt => (
                <button key={opt.type} onClick={() => { setSourceType(opt.type); setStep("details"); }} className="group flex items-center gap-4 p-4 rounded-xl border text-left hover:border-zinc-300 transition-all" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-tertiary)" }}><opt.icon size={20} style={{ color: "var(--text-secondary)" }} /></div>
                  <div><div className="text-sm font-medium mb-0.5" style={{ color: "var(--text-primary)" }}>{opt.label}</div><div className="text-xs" style={{ color: "var(--text-muted)" }}>{opt.desc}</div></div>
                </button>
              ))}
            </div>
          </div>
        )}
        {step === "details" && sourceType && (
          <div>
            <button onClick={() => setStep("type")} className="flex items-center gap-1.5 text-xs mb-6 hover:underline" style={{ color: "var(--text-muted)" }}>← Back</button>
            <h1 className="text-xl font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Project details</h1>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Project name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. my-awesome-project" className="w-full px-3 py-2.5 text-sm rounded-xl border bg-transparent outline-none" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} />
              </div>
              {sourceType === "local_folder" && (
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Local folder path</label>
                <input type="text" value={localPath} onChange={e => setLocalPath(e.target.value)} placeholder="/home/ryan/projects/my-project" className="w-full px-3 py-2.5 text-sm rounded-xl border bg-transparent outline-none font-mono" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} /></div>
              )}
              {sourceType === "github" && (
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>GitHub URL or owner/repo</label>
                <input type="text" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/owner/repo or owner/repo" className="w-full px-3 py-2.5 text-sm rounded-xl border bg-transparent outline-none font-mono" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} />
                <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>We&apos;ll fetch metadata if you have a GitHub token configured.</p></div>
              )}
              {sourceType === "git_remote" && (
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Git remote URL</label>
                <input type="text" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://gitlab.com/owner/repo.git" className="w-full px-3 py-2.5 text-sm rounded-xl border bg-transparent outline-none font-mono" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} /></div>
              )}
              <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description (optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" rows={3} className="w-full px-3 py-2.5 text-sm rounded-xl border bg-transparent outline-none resize-none" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} /></div>
              <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Tags (comma-separated)</label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="nextjs, typescript, ai" className="w-full px-3 py-2.5 text-sm rounded-xl border bg-transparent outline-none" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} /></div>
              {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}
              <button onClick={handleSubmit} disabled={submitting} className="w-full py-2.5 text-sm font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><Check size={14} /> Create project</>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}