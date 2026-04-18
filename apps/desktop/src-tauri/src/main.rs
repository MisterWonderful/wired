// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, OptionalExtension};
use serde::Serialize;
use std::fs::create_dir_all;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
struct ProjectSummary {
    id: String,
    name: String,
    local_path: Option<String>,
}

#[tauri::command]
fn list_projects(app: AppHandle) -> Result<Vec<ProjectSummary>, String> {
    let db_path = resolve_database_path(&app)?;

    if let Some(parent) = db_path.parent() {
        create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let connection = Connection::open(&db_path).map_err(|error| error.to_string())?;
    let has_project_table = connection
        .query_row(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project' LIMIT 1",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .is_some();

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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![list_projects])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
