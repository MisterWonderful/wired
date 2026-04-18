import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ScanTriggerResult, ScanType } from "@wired/core";

interface Project {
  id: string;
  name: string;
  local_path: string | null;
}

interface RecentScan {
  id: string;
  scan_type: string;
  result_summary: string;
  created_at: string;
}

type ScanMode = "remote" | "offline";

const DEFAULT_SERVER_URL = "http://127.0.0.1:3008";
const SERVER_URL_STORAGE_KEY = "wired.desktop.serverUrl";
const SCAN_TOKEN_STORAGE_KEY = "wired.desktop.scanToken";
const RECENT_SCAN_LIMIT = 5;

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>("remote");
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [scanToken, setScanToken] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanningProjectId, setScanningProjectId] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<ScanTriggerResult | null>(null);
  const [recentScansByProject, setRecentScansByProject] = useState<Record<string, RecentScan[]>>({});
  const [recentScansLoadingByProject, setRecentScansLoadingByProject] = useState<Record<string, boolean>>({});
  const [recentScansErrorByProject, setRecentScansErrorByProject] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    invoke<Project[]>("list_projects")
      .then(setProjects)
      .catch((error) => {
        console.error("Failed to load projects:", error);
        setLoadError("Unable to load local projects");
      });
  }, []);

  useEffect(() => {
    const storedServerUrl = window.localStorage.getItem(SERVER_URL_STORAGE_KEY);
    const storedScanToken = window.localStorage.getItem(SCAN_TOKEN_STORAGE_KEY);

    if (storedServerUrl) {
      setServerUrl(storedServerUrl);
    }

    if (storedScanToken) {
      setScanToken(storedScanToken);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SERVER_URL_STORAGE_KEY, serverUrl);
  }, [serverUrl]);

  useEffect(() => {
    window.localStorage.setItem(SCAN_TOKEN_STORAGE_KEY, scanToken);
  }, [scanToken]);

  useEffect(() => {
    projects.forEach((project) => {
      void refreshRecentScans(project.id);
    });
  }, [projects]);

  async function refreshRecentScans(projectId: string) {
    setRecentScansLoadingByProject((current) => ({
      ...current,
      [projectId]: true,
    }));
    setRecentScansErrorByProject((current) => ({
      ...current,
      [projectId]: undefined,
    }));

    try {
      const recentScans = await invoke<RecentScan[]>("list_recent_scans", {
        projectId,
        limit: RECENT_SCAN_LIMIT,
      });

      setRecentScansByProject((current) => ({
        ...current,
        [projectId]: recentScans,
      }));
    } catch (error) {
      console.error(`Failed to load recent scans for ${projectId}:`, error);
      setRecentScansErrorByProject((current) => ({
        ...current,
        [projectId]: "Unable to load recent scans",
      }));
    } finally {
      setRecentScansLoadingByProject((current) => ({
        ...current,
        [projectId]: false,
      }));
    }
  }

  function buildRemoteScanPayload(projectId: string, scanType: ScanType) {
    const payload: {
      serverUrl: string;
      projectId: string;
      scanType: ScanType;
      scanToken?: string;
    } = {
      serverUrl: serverUrl.trim(),
      projectId,
      scanType,
    };

    const trimmedToken = scanToken.trim();
    if (trimmedToken) {
      payload.scanToken = trimmedToken;
    }

    return payload;
  }

  async function triggerRemoteScan(projectId: string, scanType: ScanType) {
    const normalizedServerUrl = serverUrl.trim();

    if (!normalizedServerUrl) {
      setScanError("Enter a remote server URL before starting a remote scan.");
      return;
    }

    setScanningProjectId(projectId);
    setScanError(null);

    try {
      const result = await invoke<ScanTriggerResult>("trigger_scan", buildRemoteScanPayload(projectId, scanType));
      setLastScanResult(result);
      await refreshRecentScans(projectId);
    } catch (error) {
      console.error("Failed to trigger remote scan:", error);
      setScanError(error instanceof Error ? error.message : "Unable to trigger remote scan");
    } finally {
      setScanningProjectId(null);
    }
  }

  async function triggerOfflineScan(projectId: string) {
    setScanningProjectId(projectId);
    setScanError(null);

    try {
      const result = await invoke<ScanTriggerResult>("run_local_scan_offline", { projectId });
      setLastScanResult(result);
      await refreshRecentScans(projectId);
    } catch (error) {
      console.error("Failed to trigger offline scan:", error);
      setScanError(error instanceof Error ? error.message : "Unable to trigger offline scan");
    } finally {
      setScanningProjectId(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f7f8fc 0%, #ffffff 100%)",
        color: "#111827",
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "32px",
      }}
    >
      <div style={{ maxWidth: "1120px", margin: "0 auto", display: "grid", gap: "20px" }}>
        <header
          style={{
            borderRadius: "20px",
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            padding: "24px",
            boxShadow: "0 12px 30px rgba(17, 24, 39, 0.05)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>Wired Desktop</h1>
              <p style={{ fontSize: "14px", lineHeight: 1.5, color: "#6b7280", margin: "8px 0 0" }}>
                Run offline local scans or remote server scans against the projects on this machine.
              </p>
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Recent scans and scan results stay local to this desktop client.</div>
          </div>
        </header>

        <section
          style={{
            borderRadius: "20px",
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            padding: "20px",
            boxShadow: "0 12px 30px rgba(17, 24, 39, 0.05)",
            display: "grid",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => setScanMode("remote")}
              style={{
                padding: "10px 14px",
                borderRadius: "999px",
                border: scanMode === "remote" ? "1px solid #111827" : "1px solid #d1d5db",
                background: scanMode === "remote" ? "#111827" : "#ffffff",
                color: scanMode === "remote" ? "#ffffff" : "#111827",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Remote server scan
            </button>
            <button
              onClick={() => setScanMode("offline")}
              style={{
                padding: "10px 14px",
                borderRadius: "999px",
                border: scanMode === "offline" ? "1px solid #111827" : "1px solid #d1d5db",
                background: scanMode === "offline" ? "#111827" : "#ffffff",
                color: scanMode === "offline" ? "#ffffff" : "#111827",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Offline local scan
            </button>
          </div>

          {scanMode === "remote" ? (
            <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#6b7280", marginBottom: "6px" }}>
                  Remote server URL
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(event) => setServerUrl(event.target.value)}
                  placeholder={DEFAULT_SERVER_URL}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px",
                    borderRadius: "12px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    background: "#ffffff",
                    color: "#111827",
                  }}
                />
                <p style={{ fontSize: "12px", color: "#6b7280", margin: "8px 0 0" }}>
                  Used only for remote scans. The local offline path ignores this value.
                </p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#6b7280", marginBottom: "6px" }}>
                  Optional remote scan token
                </label>
                <input
                  type="password"
                  value={scanToken}
                  onChange={(event) => setScanToken(event.target.value)}
                  placeholder="Leave blank if not required"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px",
                    borderRadius: "12px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    background: "#ffffff",
                    color: "#111827",
                  }}
                />
                <p style={{ fontSize: "12px", color: "#6b7280", margin: "8px 0 0" }}>
                  Saved locally in this desktop client and sent only with remote scans when present.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                borderRadius: "14px",
                border: "1px solid #d1d5db",
                background: "#f9fafb",
                padding: "14px 16px",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>Offline local mode</div>
              <div style={{ fontSize: "13px", lineHeight: 1.5, color: "#6b7280" }}>
                Runs `run_local_scan_offline` directly against the selected project without using a server URL or token.
              </div>
            </div>
          )}
        </section>

        {scanError && (
          <div
            style={{
              borderRadius: "14px",
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              padding: "12px 14px",
              fontSize: "13px",
            }}
          >
            {scanError}
          </div>
        )}

        {lastScanResult && (
          <section
            style={{
              borderRadius: "20px",
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              padding: "20px",
              boxShadow: "0 12px 30px rgba(17, 24, 39, 0.05)",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
              <strong style={{ fontSize: "15px" }}>Last scan result</strong>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                {lastScanResult.scanType === "ai" ? "AI" : "Local"} scan at {new Date(lastScanResult.scannedAt).toLocaleString()}
              </span>
            </div>

            <div style={{ fontSize: "13px", lineHeight: 1.6, color: "#374151", marginBottom: "14px" }}>{lastScanResult.summary}</div>

            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <div style={{ borderRadius: "14px", border: "1px solid #e5e7eb", background: "#f9fafb", padding: "12px" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Branch</div>
                <div style={{ fontSize: "13px" }}>{lastScanResult.git.branch || "n/a"}</div>
              </div>
              <div style={{ borderRadius: "14px", border: "1px solid #e5e7eb", background: "#f9fafb", padding: "12px" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Dirty files</div>
                <div style={{ fontSize: "13px" }}>{lastScanResult.git.dirtyFileCount}</div>
              </div>
              <div style={{ borderRadius: "14px", border: "1px solid #e5e7eb", background: "#f9fafb", padding: "12px" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Website ready</div>
                <div style={{ fontSize: "13px" }}>{lastScanResult.persistence.websiteReady ? "yes" : "no"}</div>
              </div>
            </div>
          </section>
        )}

        <section
          style={{
            borderRadius: "20px",
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            padding: "20px",
            boxShadow: "0 12px 30px rgba(17, 24, 39, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Projects</h2>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: "6px 0 0" }}>
                {scanMode === "remote"
                  ? "Run remote scans with the saved server URL and optional token."
                  : "Run offline scans directly on the local workspace."
                }
              </p>
            </div>
            {loadError && <span style={{ fontSize: "12px", color: "#b42318" }}>{loadError}</span>}
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {projects.map((project) => {
              const scanning = scanningProjectId === project.id;
              const recentScans = recentScansByProject[project.id] ?? [];
              const recentScansLoading = recentScansLoadingByProject[project.id] ?? false;
              const recentScansError = recentScansErrorByProject[project.id];

              return (
                <article
                  key={project.id}
                  style={{
                    borderRadius: "16px",
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    padding: "16px",
                    display: "grid",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>{project.name}</div>
                      {project.local_path && (
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px", fontFamily: "monospace", wordBreak: "break-all" }}>
                          {project.local_path}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {scanMode === "remote" ? (
                        <>
                          <button
                            onClick={() => triggerRemoteScan(project.id, "local")}
                            disabled={scanning}
                            style={{
                              padding: "9px 12px",
                              borderRadius: "10px",
                              border: "1px solid #d1d5db",
                              background: "#ffffff",
                              cursor: scanning ? "not-allowed" : "pointer",
                              fontSize: "13px",
                              color: "#111827",
                              opacity: scanning ? 0.7 : 1,
                              fontWeight: 600,
                            }}
                          >
                            {scanning ? "Working…" : "Remote local scan"}
                          </button>
                          <button
                            onClick={() => triggerRemoteScan(project.id, "ai")}
                            disabled={scanning}
                            style={{
                              padding: "9px 12px",
                              borderRadius: "10px",
                              border: "1px solid #111827",
                              background: "#111827",
                              cursor: scanning ? "not-allowed" : "pointer",
                              fontSize: "13px",
                              color: "#ffffff",
                              opacity: scanning ? 0.7 : 1,
                              fontWeight: 600,
                            }}
                          >
                            {scanning ? "Working…" : "Remote AI scan"}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => triggerOfflineScan(project.id)}
                          disabled={scanning}
                          style={{
                            padding: "9px 12px",
                            borderRadius: "10px",
                            border: "1px solid #111827",
                            background: "#111827",
                            cursor: scanning ? "not-allowed" : "pointer",
                            fontSize: "13px",
                            color: "#ffffff",
                            opacity: scanning ? 0.7 : 1,
                            fontWeight: 600,
                          }}
                        >
                          {scanning ? "Working…" : "Run offline local scan"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700 }}>Recent scans</div>
                      <button
                        onClick={() => refreshRecentScans(project.id)}
                        disabled={recentScansLoading}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#4f46e5",
                          padding: 0,
                          cursor: recentScansLoading ? "not-allowed" : "pointer",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        Refresh
                      </button>
                    </div>

                    {recentScansError && <div style={{ fontSize: "12px", color: "#b42318", marginBottom: "10px" }}>{recentScansError}</div>}

                    {recentScansLoading ? (
                      <div style={{ fontSize: "13px", color: "#6b7280" }}>Loading recent scans…</div>
                    ) : recentScans.length > 0 ? (
                      <div style={{ display: "grid", gap: "10px" }}>
                        {recentScans.map((scan) => (
                          <div
                            key={scan.id}
                            style={{
                              borderRadius: "14px",
                              border: "1px solid #e5e7eb",
                              background: "#f9fafb",
                              padding: "12px 14px",
                              display: "grid",
                              gap: "6px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{formatScanType(scan.scan_type)}</div>
                              <div style={{ fontSize: "12px", color: "#6b7280" }}>{new Date(scan.created_at).toLocaleString()}</div>
                            </div>
                            <div style={{ fontSize: "13px", lineHeight: 1.5, color: "#374151" }}>{scan.result_summary}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "13px", color: "#6b7280" }}>No recent scans yet.</div>
                    )}
                  </div>
                </article>
              );
            })}

            {projects.length === 0 && !loadError && (
              <div
                style={{
                  borderRadius: "14px",
                  border: "1px dashed #d1d5db",
                  background: "#fafafa",
                  padding: "16px",
                  fontSize: "13px",
                  color: "#6b7280",
                }}
              >
                No local projects found yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function formatScanType(scanType: string) {
  if (scanType === "ai") {
    return "AI";
  }

  if (scanType === "local") {
    return "Local";
  }

  return scanType;
}

export default App;
