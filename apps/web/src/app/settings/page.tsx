"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    aiProvider: "openai",
    aiBaseUrl: "https://api.openai.com/v1",
    aiModel: "gpt-4o-mini",
    aiApiKey: "",
    githubToken: "",
    defaultSyncFolder: ".wired/notes",
    defaultSyncMode: "write_only",
    theme: "system",
  });
  const [original, setOriginal] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAiKey, setShowAiKey] = useState(false);
  const [showGhToken, setShowGhToken] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === "object") {
          const loaded = {
            aiProvider: data.ai_provider || "openai",
            aiBaseUrl: data.ai_base_url || "https://api.openai.com/v1",
            aiModel: data.ai_model || "gpt-4o-mini",
            aiApiKey: data.ai_api_key || "",
            githubToken: data.github_token || "",
            defaultSyncFolder: data.default_sync_folder || ".wired/notes",
            defaultSyncMode: data.default_sync_mode || "write_only",
            theme: data.theme || "system",
          };
          setSettings(loaded);
          setOriginal(loaded); try { localStorage.setItem("wired-theme", loaded.theme); if(loaded.theme === "dark") { document.documentElement.classList.add("dark"); } else if(loaded.theme === "light") { document.documentElement.classList.remove("dark"); } else { const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches; if(isDark) { document.documentElement.classList.add("dark"); } else { document.documentElement.classList.remove("dark"); } } } catch(e){}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(original);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_provider: settings.aiProvider,
          ai_base_url: settings.aiBaseUrl,
          ai_model: settings.aiModel,
          ai_api_key: settings.aiApiKey || null,
          github_token: settings.githubToken || null,
          default_sync_folder: settings.defaultSyncFolder,
          default_sync_mode: settings.defaultSyncMode,
          theme: settings.theme,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setOriginal(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", paddingBottom: "100px" }}>
      <header style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", padding: "0 16px", height: "56px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", padding: "6px", borderRadius: "8px", textDecoration: "none" }}>
            <ArrowLeft size={16} style={{ color: "var(--text-muted)" }} />
          </Link>
          <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>Settings</span>
          {saved && (
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#22c55e" }}>
              <Check size={12} /> Saved
            </span>
          )}
        </div>
      </header>

      <main style={{ maxWidth: "560px", margin: "0 auto", padding: "24px 16px 0" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 size={20} style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
          </div>
        ) : (
          <>
            <section style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Provider</h2>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "6px" }}>Provider</label>
                  <select value={settings.aiProvider} onChange={e => setSettings(s => ({ ...s, aiProvider: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", fontSize: "13px", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="ollama">Ollama (local)</option>
                    <option value="custom">Custom endpoint</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "6px" }}>Base URL</label>
                  <input type="text" value={settings.aiBaseUrl} onChange={e => setSettings(s => ({ ...s, aiBaseUrl: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", fontSize: "13px", color: "var(--text-primary)", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "6px" }}>Model</label>
                  <input type="text" value={settings.aiModel} onChange={e => setSettings(s => ({ ...s, aiModel: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", fontSize: "13px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "6px" }}>API Key</label>
                  <div style={{ position: "relative" }}>
                    <input type={showAiKey ? "text" : "password"} value={settings.aiApiKey} onChange={e => setSettings(s => ({ ...s, aiApiKey: e.target.value }))} placeholder="sk-…"
                      style={{ width: "100%", padding: "9px 36px 9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", fontSize: "13px", color: "var(--text-primary)", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
                    <button onClick={() => setShowAiKey(!showAiKey)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
                      {showAiKey ? <EyeOff size={13} style={{ color: "var(--text-muted)" }} /> : <Eye size={13} style={{ color: "var(--text-muted)" }} />}
                    </button>
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>Stored locally. Never synced.</p>
                </div>
              </div>
            </section>

            <section style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>GitHub</h2>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "6px" }}>Personal Access Token</label>
                  <div style={{ position: "relative" }}>
                    <input type={showGhToken ? "text" : "password"} value={settings.githubToken} onChange={e => setSettings(s => ({ ...s, githubToken: e.target.value }))} placeholder="ghp_…"
                      style={{ width: "100%", padding: "9px 36px 9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", fontSize: "13px", color: "var(--text-primary)", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
                    <button onClick={() => setShowGhToken(!showGhToken)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
                      {showGhToken ? <EyeOff size={13} style={{ color: "var(--text-muted)" }}/> : <Eye size={13} style={{ color: "var(--text-muted)" }} />}
                    </button>
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>Used to fetch repo metadata. Stored locally.</p>
                </div>
              </div>
            </section>

            <section style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Note Sync</h2>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "6px" }}>Default sync folder</label>
                  <input type="text" value={settings.defaultSyncFolder} onChange={e => setSettings(s => ({ ...s, defaultSyncFolder: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", fontSize: "13px", color: "var(--text-primary)", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "6px" }}>Sync mode</label>
                  <select value={settings.defaultSyncMode} onChange={e => setSettings(s => ({ ...s, defaultSyncMode: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", fontSize: "13px", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}>
                    <option value="write_only">Write file only</option>
                    <option value="write_stage">Write + stage</option>
                    <option value="write_stage_commit">Write + stage + commit</option>
                  </select>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>Auto-push is never enabled.</p>
                </div>
              </div>
            </section>

            <section style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Appearance</h2>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
                <select value={settings.theme} onChange={e => { const t = e.target.value; setSettings(s => ({ ...s, theme: t })); try { localStorage.setItem("wired-theme", t); if(t === "dark") { document.documentElement.classList.add("dark"); } else if(t === "light") { document.documentElement.classList.remove("dark"); } else { const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches; if(isDark) { document.documentElement.classList.add("dark"); } else { document.documentElement.classList.remove("dark"); } } } catch(e){} }}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", fontSize: "13px", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}>
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </section>

            {error && <p style={{ fontSize: "13px", color: "#ef4444", marginBottom: "12px" }}>{error}</p>}

            <button onClick={handleSave} disabled={saving || !hasChanges}
              style={{
                width: "100%", padding: "12px", borderRadius: "10px", border: "none", fontSize: "14px", fontWeight: "500",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: saving || !hasChanges ? "not-allowed" : "pointer",
                background: hasChanges ? "var(--text-primary)" : "var(--bg-tertiary)",
                color: hasChanges ? "var(--bg-primary)" : "var(--text-muted)",
                opacity: saving ? 0.6 : 1, transition: "all 0.15s",
              }}>
              {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : <><Check size={14} /> Save settings</>}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
