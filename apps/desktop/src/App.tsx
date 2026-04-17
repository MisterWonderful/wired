import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface Project {
  id: string;
  name: string;
  local_path: string | null;
}

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:3008/api/projects")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProjects(data); })
      .catch(console.error);
  }, []);

  async function pickFolder() {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) setSelectedPath(selected as string);
    } catch (e) {
      console.error("Failed to open folder picker:", e);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "system-ui, -apple-system, sans-serif", padding: "32px" }}>
      <header style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>Wired Desktop</h1>
        <p style={{ fontSize: "14px", color: "#6b6b6b", margin: "4px 0 0" }}>Quick-capture and project management</p>
      </header>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#6b6b6b", margin: "0 0 12px" }}>Pick a folder</h2>
        <button
          onClick={pickFolder}
          style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #e5e5e5", background: "#ffffff", cursor: "pointer", fontSize: "14px", color: "#1a1a1a" }}
        >
          {selectedPath || "Choose folder…"}
        </button>
      </section>

      <section>
        <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#6b6b6b", margin: "0 0 12px" }}>Projects</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {projects.map(p => (
            <div key={p.id} style={{ padding: "12px 16px", border: "1px solid #e5e5e5", borderRadius: "10px" }}>
              <div style={{ fontSize: "14px", fontWeight: "500", color: "#1a1a1a" }}>{p.name}</div>
              {p.local_path && <div style={{ fontSize: "12px", color: "#a0a0a0", marginTop: "2px", fontFamily: "monospace" }}>{p.local_path}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;
