// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Url;
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use serde_json::{json, Value};
use std::ffi::OsStr;
use std::fs::{create_dir_all, read};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use time::OffsetDateTime;
use walkdir::{DirEntry, WalkDir};

const IGNORED_DIRS: [&str; 13] = [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "out",
    "coverage",
    "target",
    "vendor",
    ".turbo",
    ".cache",
    ".pnpm",
    ".yarn",
];

const ENTRY_PATTERNS: [&str; 13] = [
    "index.ts",
    "index.tsx",
    "index.js",
    "index.jsx",
    "main.ts",
    "main.tsx",
    "main.js",
    "main.jsx",
    "app.ts",
    "app.tsx",
    "app.js",
    "server.ts",
    "server.js",
];

const CONFIG_FILES: [&str; 16] = [
    "package.json",
    "tsconfig.json",
    "vite.config.ts",
    "vite.config.js",
    "next.config.ts",
    "next.config.js",
    "tailwind.config.ts",
    "tailwind.config.js",
    "drizzle.config.ts",
    "docker-compose.yml",
    "Dockerfile",
    ".env.example",
    "pyproject.toml",
    "requirements.txt",
    "go.mod",
    "Cargo.toml",
];

const DOC_PATTERNS: [&str; 7] = [
    "readme.md",
    "changelog.md",
    "roadmap.md",
    "todo.md",
    "contributing.md",
    "license.md",
    "docs/readme.md",
];

const TEST_PATTERNS: [&str; 8] = [
    "test.ts",
    "test.tsx",
    "spec.ts",
    "spec.tsx",
    ".test.",
    ".spec.",
    "__tests__",
    "tests/",
];

#[derive(Serialize)]
struct ProjectSummary {
    id: String,
    name: String,
    local_path: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
struct ScanHistoryItem {
    id: String,
    scan_type: String,
    result_summary: String,
    created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ScanTriggerResult {
    scan_id: String,
    snapshot_id: Option<String>,
    project_id: String,
    scan_type: String,
    scanned_at: String,
    summary: String,
    git: TriggeredScanGitSummary,
    files: Option<ScanFileSummary>,
    todos: Option<Vec<ScanTodo>>,
    intelligence: Option<Value>,
    persistence: ScanPersistenceSummary,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TriggeredScanGitSummary {
    branch: Option<String>,
    default_branch: Option<String>,
    is_dirty: bool,
    dirty_file_count: usize,
    dirty_files: Vec<String>,
    recent_commits: Vec<GitCommit>,
    remote_url: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ScanFileSummary {
    total_scanned: usize,
    top_files: Vec<ScanFileItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ScanFileItem {
    path: String,
    extension: String,
    size_bytes: u64,
    relevance_score: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ScanTodo {
    path: String,
    line: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ScanPersistenceSummary {
    project_scan_stored: bool,
    intelligence_snapshot_stored: bool,
    website_ready: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GitCommit {
    hash: String,
    message: String,
    author: Option<String>,
    date: Option<String>,
}

struct FileCandidate {
    path: String,
    size_bytes: u64,
    extension: String,
    contains_todo: bool,
    is_config: bool,
    is_doc: bool,
    is_entry_point: bool,
    is_test: bool,
    relevance_score: i32,
}

struct ProjectRecord {
    id: String,
    name: String,
    local_path: Option<String>,
}

struct GitRepoInfo {
    branch: Option<String>,
    default_branch: Option<String>,
    is_dirty: bool,
    dirty_files: Vec<String>,
    recent_commits: Vec<GitCommit>,
    remote_url: Option<String>,
}

#[tauri::command]
async fn trigger_scan(
    server_url: String,
    project_id: String,
    scan_type: String,
    scan_token: Option<String>,
) -> Result<Value, String> {
    if scan_type != "local" && scan_type != "ai" {
        return Err("scan_type must be 'local' or 'ai'".to_string());
    }

    let normalized_server_url = normalize_server_url(&server_url)?;
    let endpoint = normalized_server_url
        .join(&format!("api/projects/{}/scan", project_id))
        .map_err(|error| error.to_string())?;

    let client = reqwest::Client::new();
    let mut request = client.post(endpoint).json(&json!({ "type": scan_type }));
    if let Some(token) = scan_token.as_ref().filter(|token| !token.trim().is_empty()) {
        request = request
            .bearer_auth(token)
            .header("X-Wired-Scan-Token", token);
    }

    let response = request.send().await.map_err(|error| error.to_string())?;
    let status = response.status();
    let payload = response.text().await.map_err(|error| error.to_string())?;
    let parsed = serde_json::from_str::<Value>(&payload).unwrap_or_else(|_| json!({ "raw": payload }));

    if !status.is_success() {
        let message = parsed
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("Scan request failed")
            .to_string();
        return Err(message);
    }

    Ok(parsed)
}

#[tauri::command]
fn list_projects(app: AppHandle) -> Result<Vec<ProjectSummary>, String> {
    let connection = open_database(&app)?;
    let has_project_table = has_table(&connection, "project")?;
    if !has_project_table {
        return Ok(Vec::new());
    }

    let mut statement = connection
        .prepare("SELECT id, name, local_path FROM project ORDER BY pinned DESC, updated_at DESC")
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(ProjectSummary {
                id: row.get(0)?,
                name: row.get(1)?,
                local_path: row.get(2)?,
            })
        })
        .map_err(|error| error.to_string())?;

    let mut projects = Vec::new();
    for row in rows {
        projects.push(row.map_err(|error| error.to_string())?);
    }

    Ok(projects)
}

#[tauri::command]
fn list_recent_scans(app: AppHandle, project_id: String, limit: Option<i64>) -> Result<Vec<ScanHistoryItem>, String> {
    let connection = open_database(&app)?;
    if !has_table(&connection, "project_scan")? {
        return Ok(Vec::new());
    }

    let mut statement = connection
        .prepare(
            "SELECT id, scan_type, result_summary, created_at FROM project_scan WHERE project_id = ? ORDER BY created_at DESC LIMIT ?",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map(params![project_id, limit.unwrap_or(8)], |row| {
            Ok(ScanHistoryItem {
                id: row.get(0)?,
                scan_type: row.get(1)?,
                result_summary: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|error| error.to_string())?;

    let mut scans = Vec::new();
    for row in rows {
        scans.push(row.map_err(|error| error.to_string())?);
    }

    Ok(scans)
}

#[tauri::command]
fn run_local_scan_offline(app: AppHandle, project_id: String) -> Result<ScanTriggerResult, String> {
    let connection = open_database(&app)?;
    let project = load_project(&connection, &project_id)?;
    let local_path = project
        .local_path
        .as_ref()
        .filter(|path| !path.trim().is_empty())
        .ok_or_else(|| "Project has no local path — cannot run offline local scan".to_string())?;

    let git = read_git_info(Path::new(local_path));
    let candidates = scan_directory(Path::new(local_path), 150)?;
    let todos = collect_todos(Path::new(local_path), &candidates);
    let summary = format!(
        "Local scan: {}, {} recent commits",
        if git.is_dirty {
            format!("{} dirty files", git.dirty_files.len())
        } else {
            "clean".to_string()
        },
        git.recent_commits.len()
    );
    let now = current_timestamp()?;
    let scan_id = create_id("desktop-local-scan");

    connection
        .execute(
            "INSERT INTO project_scan (id, project_id, scan_type, git_status_json, recent_commits_json, detected_files_json, todos_json, dirty_files_json, result_summary, created_at)
             VALUES (?, ?, 'local', ?, ?, ?, ?, ?, ?, ?)",
            params![
                &scan_id,
                &project.id,
                serde_json::to_string(&json!({
                    "branch": git.branch,
                    "defaultBranch": git.default_branch,
                    "isDirty": git.is_dirty,
                    "dirtyFileCount": git.dirty_files.len(),
                    "dirtyFiles": git.dirty_files,
                    "remoteUrl": git.remote_url,
                }))
                .map_err(|error| error.to_string())?,
                serde_json::to_string(&git.recent_commits).map_err(|error| error.to_string())?,
                serde_json::to_string(
                    &candidates
                        .iter()
                        .take(50)
                        .map(|candidate| json!({
                            "path": candidate.path,
                            "extension": candidate.extension,
                            "sizeBytes": candidate.size_bytes,
                            "relevanceScore": candidate.relevance_score,
                        }))
                        .collect::<Vec<Value>>(),
                )
                .map_err(|error| error.to_string())?,
                serde_json::to_string(&todos).map_err(|error| error.to_string())?,
                serde_json::to_string(&git.dirty_files).map_err(|error| error.to_string())?,
                &summary,
                &now,
            ],
        )
        .map_err(|error| error.to_string())?;

    connection
        .execute(
            "UPDATE project SET last_scanned_at = ?, updated_at = ? WHERE id = ?",
            params![&now, &now, &project.id],
        )
        .map_err(|error| error.to_string())?;

    connection
        .execute(
            "INSERT INTO activity_event (id, project_id, note_id, type, title, message, metadata_json, created_at)
             VALUES (?, ?, NULL, 'project_scanned', 'Offline local scan', ?, ?, ?)",
            params![
                create_id("activity"),
                &project.id,
                &summary,
                serde_json::to_string(&json!({ "scanId": scan_id, "source": "desktop" })).map_err(|error| error.to_string())?,
                &now,
            ],
        )
        .ok();

    Ok(ScanTriggerResult {
        scan_id,
        snapshot_id: None,
        project_id: project.id,
        scan_type: "local".to_string(),
        scanned_at: now,
        summary,
        git: TriggeredScanGitSummary {
            branch: git.branch,
            default_branch: git.default_branch,
            is_dirty: git.is_dirty,
            dirty_file_count: git.dirty_files.len(),
            dirty_files: git.dirty_files.into_iter().take(20).collect(),
            recent_commits: git.recent_commits.into_iter().take(10).collect(),
            remote_url: git.remote_url,
        },
        files: Some(ScanFileSummary {
            total_scanned: candidates.len(),
            top_files: candidates
                .iter()
                .take(20)
                .map(|candidate| ScanFileItem {
                    path: candidate.path.clone(),
                    extension: candidate.extension.clone(),
                    size_bytes: candidate.size_bytes,
                    relevance_score: candidate.relevance_score,
                })
                .collect(),
        }),
        todos: Some(todos),
        intelligence: None,
        persistence: ScanPersistenceSummary {
            project_scan_stored: true,
            intelligence_snapshot_stored: false,
            website_ready: true,
        },
    })
}

fn open_database(app: &AppHandle) -> Result<Connection, String> {
    let db_path = resolve_database_path(app)?;
    if let Some(parent) = db_path.parent() {
        create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    Connection::open(&db_path).map_err(|error| error.to_string())
}

fn load_project(connection: &Connection, project_id: &str) -> Result<ProjectRecord, String> {
    connection
        .query_row(
            "SELECT id, name, local_path FROM project WHERE id = ? LIMIT 1",
            params![project_id],
            |row| {
                Ok(ProjectRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    local_path: row.get(2)?,
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Project not found".to_string())
}

fn has_table(connection: &Connection, table_name: &str) -> Result<bool, String> {
    connection
        .query_row(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
            params![table_name],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())
        .map(|value| value.is_some())
}

fn resolve_database_path(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(database_url) = std::env::var("DATABASE_URL") {
        return Ok(PathBuf::from(
            database_url
                .trim_start_matches("file:")
                .trim_start_matches("sqlite:"),
        ));
    }

    let repo_database = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../data/wired.db")
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../data/wired.db"));

    if repo_database.exists() {
        return Ok(repo_database);
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    Ok(app_data_dir.join("wired.db"))
}

fn normalize_server_url(server_url: &str) -> Result<Url, String> {
    let normalized = if server_url.ends_with('/') {
        server_url.to_string()
    } else {
        format!("{}/", server_url)
    };

    Url::parse(&normalized).map_err(|error| error.to_string())
}

fn current_timestamp() -> Result<String, String> {
    OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .map_err(|error| error.to_string())
}

fn create_id(prefix: &str) -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    format!("{}-{}", prefix, nanos)
}

fn read_git_info(root: &Path) -> GitRepoInfo {
    if !run_git(root, &["rev-parse", "--is-inside-work-tree"])
        .map(|output| output.trim() == "true")
        .unwrap_or(false)
    {
        return GitRepoInfo {
            branch: None,
            default_branch: None,
            is_dirty: false,
            dirty_files: Vec::new(),
            recent_commits: Vec::new(),
            remote_url: None,
        };
    }

    let branch = run_git(root, &["branch", "--show-current"]).filter(|value| !value.trim().is_empty());
    let default_branch = run_git(root, &["symbolic-ref", "refs/remotes/origin/HEAD"])
        .map(|value| value.trim().trim_start_matches("refs/remotes/origin/").to_string())
        .or_else(|| branch.clone());
    let remote_url = run_git(root, &["remote", "get-url", "origin"]).filter(|value| !value.trim().is_empty());
    let status_lines = run_git(root, &["status", "--porcelain"])
        .map(|output| output.lines().map(|line| line.to_string()).collect::<Vec<_>>())
        .unwrap_or_default();
    let dirty_files = status_lines
        .iter()
        .filter_map(|line| line.get(3..).map(|value| value.trim().to_string()))
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>();
    let recent_commits = run_git(
        root,
        &["log", "--max-count=10", "--date=iso-strict", "--pretty=format:%H%x1f%s%x1f%an%x1f%ad"],
    )
    .map(|output| {
        output
            .lines()
            .filter_map(|line| {
                let mut parts = line.split('\u{1f}');
                let hash = parts.next()?.to_string();
                let message = parts.next()?.to_string();
                let author = parts.next().map(|value| value.to_string());
                let date = parts.next().map(|value| value.to_string());
                Some(GitCommit {
                    hash: hash.chars().take(7).collect(),
                    message,
                    author,
                    date,
                })
            })
            .collect::<Vec<_>>()
    })
    .unwrap_or_default();

    GitRepoInfo {
        branch,
        default_branch,
        is_dirty: !dirty_files.is_empty(),
        dirty_files,
        recent_commits,
        remote_url,
    }
}

fn run_git(root: &Path, args: &[&str]) -> Option<String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(root)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    String::from_utf8(output.stdout)
        .ok()
        .map(|value| value.trim().to_string())
}

fn scan_directory(root: &Path, max_files: usize) -> Result<Vec<FileCandidate>, String> {
    let root = root
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let mut candidates = Vec::new();

    for entry in WalkDir::new(&root)
        .into_iter()
        .filter_entry(should_visit_entry)
        .filter_map(Result::ok)
    {
        if !entry.file_type().is_file() {
            continue;
        }
        if candidates.len() >= max_files {
            break;
        }

        let candidate = build_candidate(&root, &entry)?;
        candidates.push(candidate);
    }

    candidates.sort_by(|left, right| right.relevance_score.cmp(&left.relevance_score));
    Ok(candidates)
}

fn should_visit_entry(entry: &DirEntry) -> bool {
    if entry.depth() == 0 {
        return true;
    }

    let file_name = entry.file_name().to_string_lossy();
    if entry.file_type().is_dir() {
        if file_name.starts_with('.') {
            return false;
        }
        return !IGNORED_DIRS.iter().any(|ignored| ignored == &file_name.as_ref());
    }

    true
}

fn build_candidate(root: &Path, entry: &DirEntry) -> Result<FileCandidate, String> {
    let absolute_path = entry.path();
    let relative_path = absolute_path
        .strip_prefix(root)
        .map_err(|error| error.to_string())?
        .to_string_lossy()
        .replace('\\', "/");
    let metadata = entry.metadata().map_err(|error| error.to_string())?;
    let size_bytes = metadata.len();
    let extension = absolute_path
        .extension()
        .and_then(OsStr::to_str)
        .map(|value| format!(".{}", value))
        .unwrap_or_default();
    let base_name = absolute_path
        .file_name()
        .and_then(OsStr::to_str)
        .unwrap_or_default()
        .to_string();
    let content = if size_bytes < 100_000 {
        read(absolute_path)
            .ok()
            .map(|bytes| String::from_utf8_lossy(&bytes).chars().take(8_000).collect::<String>())
            .unwrap_or_default()
    } else {
        String::new()
    };
    let relative_lower = relative_path.to_lowercase();
    let contains_todo = contains_todo_marker(&content);
    let is_config = CONFIG_FILES
        .iter()
        .any(|value| relative_path.ends_with(value) || base_name == *value);
    let is_doc = DOC_PATTERNS.iter().any(|value| relative_lower.ends_with(value));
    let is_entry_point = ENTRY_PATTERNS.contains(&base_name.as_str());
    let is_test = TEST_PATTERNS.iter().any(|value| relative_path.contains(value));

    let mut relevance_score = 0;
    if is_doc {
        relevance_score += 35;
    }
    if is_config {
        relevance_score += 25;
    }
    if is_entry_point {
        relevance_score += 25;
    }
    if contains_todo {
        relevance_score += 15;
    }
    if is_test {
        relevance_score += 10;
    }
    if size_bytes > 100_000 {
        relevance_score -= 30;
    }

    Ok(FileCandidate {
        path: relative_path,
        size_bytes,
        extension,
        contains_todo,
        is_config,
        is_doc,
        is_entry_point,
        is_test,
        relevance_score,
    })
}

fn collect_todos(root: &Path, candidates: &[FileCandidate]) -> Vec<ScanTodo> {
    let mut todos = Vec::new();

    for candidate in candidates.iter().take(50) {
        if !candidate.contains_todo {
            continue;
        }

        let full_path = root.join(&candidate.path);
        let content = read(&full_path)
            .ok()
            .map(|bytes| String::from_utf8_lossy(&bytes).chars().take(5_000).collect::<String>())
            .unwrap_or_default();

        for line in content.lines() {
            if contains_todo_marker(line) {
                todos.push(ScanTodo {
                    path: candidate.path.clone(),
                    line: line.trim().chars().take(120).collect(),
                });
                if todos.len() >= 20 {
                    return todos;
                }
            }
        }
    }

    todos
}

fn contains_todo_marker(content: &str) -> bool {
    let upper = content.to_ascii_uppercase();
    upper.contains("TODO") || upper.contains("FIXME") || upper.contains("XXX")
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            list_projects,
            trigger_scan,
            list_recent_scans,
            run_local_scan_offline
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
