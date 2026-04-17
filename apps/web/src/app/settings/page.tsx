"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, Eye, EyeOff } from "lucide-react";

const css = {
  bgPrimary: "#ffffff", bgSecondary: "#fafafa", bgTertiary: "#f5f5f5",
  bgCard: "#ffffff", border: "#e5e5e5",
  textPrimary: "#1a1a1a", textSecondary: "#6b6b6b", textMuted: "#a0a0a0",
};
const s = (v: Record<string, string>) => v as any;

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    aiProvider: "openai", aiBaseUrl: "https://api.openai.com/v1", aiModel: "gpt-4o-mini",
    aiApiKey: "", githubToken: "", defaultSyncFolder: ".wired/notes", defaultSyncMode: "write_only", theme: "system",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAiKey, setShowAiKey] = useState(false);
  const [showGhToken, setShowGhToken] = useState(false);

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen pb-20" style={s({ "--bg-primary": css.bgPrimary, "--bg-secondary": css.bgSecondary, "--bg-tertiary": css.bgTertiary, "--bg-card": css.bgCard, "--border": css.border, "--text-primary": css.textPrimary, "--text-secondary": css.textSecondary, "--text-muted": css.textMuted })}>
      <header className="border-b sticky top-0 z-50 bg-white/80 backdrop-blur-sm" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 rounded-lg hover:bg-zinc-100"><ArrowLeft size={16} style={{ color: "var(--text-muted)" }} /></Link>
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Settings</span>
          {saved && <span className="text-xs flex items-center gap-1 ml-auto" style={{ color: "#22c55e" }}><Check size={12} /> Saved</span>}
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>AI Provider</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Provider</label>
              <select value={settings.aiProvider} onChange={e => setSettings(s => ({ ...s, aiProvider: e.target.value }))} className="w-full px-3 py-2.5 text-sm rounded-xl border bg-transparent outline-none" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                <option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="ollama">Ollama (local)</option><option value="custom">Custom endpoint</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Base URL</label>
              <input type="text" value={settings.aiBaseUrl} onChange={e => setSettings(s => ({ ...s, aiBaseUrl: e.target.value }))} className="w-full px-3 py-2.5 text-sm rounded-xl border bg-transparent outline-none font-mono" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Model</label>
              <input type="text" value={settings.aiModel} onChange={e => setSettings(s => ({ ...s, aiModel: e.target.value }))} className="w-full px-3 py-2.5 text-sm rounded-xl border bg-transparent outline-none" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>API Key</label>
              <div className="relative">
                <input type={showAiKey ? "text" : "password"} value={settings.aiApiKey} onChange={e => setSettings(s => ({ ...s, aiApiKey: e.target.value }))} placeholder="sk-..." className="w-full px-3 py-2.5 pr-10 text-sm rounded-xl border bg-transparent outline-none font-mono" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} />
                <button onClick={() => setShowAiKey(!showAiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded" style={{ color: "var(--text-muted)" }}>{showAiKey ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>Stored locally. Never synced.</p>
            </div>
          </div>
        </section>
        <section>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>GitHub</h2>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Personal Access Token</label>
            <div className="relative">
              <input type={showGhToken ? "text" : "password"} value={settings.githubToken} onChange={e => setSettings(s => ({ ...s, githubToken: e.target.value }))} placeholder="ghp_..." className="w-full px-3 py-2.5 pr-10 text-sm rounded-xl border bg-transparent outline-none font-mono" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} />
              <button onClick={() => setShowGhToken(!showGhToken)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded" style={{ color: "var(--text-muted)" }}>{showGhToken ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
            <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>Used to fetch repo metadata and commits.</p>
          </div>
        </section>
        <section>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Note sync</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Default sync folder</label>
              <input type="text" value={settings.defaultSyncFolder} onChange={e => setSettings(s => ({ ...s, defaultSyncFolder: e.target.value }))} className="w-full px-3 py-2.5 text-sm rounded-xl border bg-transparent outline-none font-mono" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Sync mode</label>
              <select value={settings.defaultSyncMode} onChange={e => setSettings(s => ({ ...s, defaultSyncMode: e.target.value }))} className="w-full px-3 py-2.5 text-sm rounded-xl border bg-transparent outline-none" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                <option value="write_only">Write file only</option><option value="write_stage">Write + stage</option><option value="write_stage_commit">Write + stage + commit</option>
              </select>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>Auto-push is never enabled.</p>
            </div>
          </div>
        </section>
        <section>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Appearance</h2>
          <select value={settings.theme} onChange={e => setSettings(s => ({ ...s, theme: e.target.value }))} className="w-full px-3 py-2.5 text-sm rounded-xl border bg-transparent outline-none" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
            <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
          </select>
        </section>
        <button onClick={handleSave} disabled={saving} className="w-full py-2.5 text-sm font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}>
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save settings</>}
        </button>
      </main>
    </div>
  );
}