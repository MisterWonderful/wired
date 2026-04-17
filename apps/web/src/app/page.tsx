"use client";

import Link from "next/link";
import { Plus, Search, Settings, Zap, ArrowRight, FileText, Activity } from "lucide-react";

const css = {
  "--bg-primary": "#ffffff",
  "--bg-secondary": "#fafafa", 
  "--bg-tertiary": "#f5f5f5",
  "--bg-card": "#ffffff",
  "--border": "#e5e5e5",
  "--text-primary": "#1a1a1a",
  "--text-secondary": "#6b6b6b",
  "--text-muted": "#a0a0a0",
} as React.CSSProperties;

export default function HomePage() {
  return (
    <div className="min-h-screen" style={css}>
      <header className="border-b sticky top-0 z-50 bg-white/80 backdrop-blur-sm" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={18} style={{ color: "var(--text-secondary)" }} />
            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Wired</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/projects" className="text-xs px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors" style={{ color: "var(--text-secondary)" }}>
              Projects
            </Link>
            <Link href="/settings" className="text-xs px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors" style={{ color: "var(--text-secondary)" }}>
              <Settings size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <section className="mb-10">
          <h1 className="text-3xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Your projects</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Add a project to get started with AI-powered intelligence and smart notes.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          <Link href="/projects/new" className="group flex items-center gap-3 p-4 rounded-xl border transition-all hover:border-zinc-300" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-tertiary)" }}>
              <Plus size={18} style={{ color: "var(--text-secondary)" }} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Add project</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Local folder, GitHub, or manual</div>
            </div>
            <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)" }} />
          </Link>

          <Link href="/projects?filter=needs-attention" className="group flex items-center gap-3 p-4 rounded-xl border transition-all hover:border-zinc-300" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-tertiary)" }}>
              <Activity size={18} style={{ color: "var(--text-secondary)" }} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Projects needing attention</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Stale scans, blockers detected</div>
            </div>
            <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)" }} />
          </Link>
        </section>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Recent</h2>
            <Link href="/projects" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>View all</Link>
          </div>
          <div className="border rounded-xl p-6 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "var(--bg-tertiary)" }}>
              <FileText size={18} style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No projects yet. Add your first project to get started.</p>
            <Link href="/projects/new" className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Add a project <ArrowRight size={12} />
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Quick note</h2>
          <div className="border rounded-xl p-4" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Create a global quick note (select project after)</p>
            <div className="flex gap-2">
              <input type="text" placeholder="Write a quick note..." className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--text-primary)" }} />
              <button className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>Save</button>
            </div>
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t flex justify-around py-2 sm:hidden" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
        <Link href="/" className="flex flex-col items-center gap-0.5 px-4 py-1">
          <Zap size={18} style={{ color: "var(--text-secondary)" }} />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Home</span>
        </Link>
        <Link href="/projects" className="flex flex-col items-center gap-0.5 px-4 py-1">
          <Search size={18} style={{ color: "var(--text-muted)" }} />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Projects</span>
        </Link>
        <Link href="/projects/new" className="flex flex-col items-center gap-0.5 px-4 py-1">
          <Plus size={18} style={{ color: "var(--text-muted)" }} />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Add</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-0.5 px-4 py-1">
          <Settings size={18} style={{ color: "var(--text-muted)" }} />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Settings</span>
        </Link>
      </nav>
    </div>
  );
}