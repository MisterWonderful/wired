# Wired — Architecture

## Overview

Wired is a monorepo pnpm workspace with a Next.js 15 web application as its primary interface. All data is stored in a local SQLite database.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Package manager | pnpm workspace |
| Web framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v3 + CSS variables |
| Database | SQLite + Drizzle ORM |
| Git integration | simple-git |
| AI | OpenAI-compatible REST API |
| Desktop | Tauri v2 (optional) |

## Directory Structure

```
apps/web/               Next.js 15 web application
  src/app/              App Router pages + API routes
    page.tsx            Home dashboard
    projects/           Project list, new project, dashboard
    settings/           Global settings
    api/                REST API routes
packages/
  core/                 TypeScript interfaces (Project, Note, Snapshot)
  db/                   Drizzle schema + SQLite client
  git/                  Git operations (branch, status, commits)
  ai/                   AI abstraction (createAIResponse)
  sync/                 Markdown frontmatter, conflict detection
  scanner/              File system scanning + ranking
  ui/                   Shared utilities (cn, formatDate)
```

## Data Flow

```
User action or desktop trigger → Next.js API Route / scan service → SQLite
                                                      ↓
                                               @wired packages
                                               (git, ai, scanner, sync)
```

## API Design

All API routes follow REST conventions:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/scan` | Stable scan trigger endpoint |
| POST | `/api/projects/:id/scan/local` | Run local scan |
| POST | `/api/projects/:id/scan/ai` | Run AI scan |
| GET | `/api/projects/:id/intelligence` | Get snapshots |
| GET | `/api/projects/:id/sync` | Get sync states |
| GET/PATCH | `/api/settings` | Get/update settings |
| POST | `/api/notes/:noteId/sync` | Sync note to repo |

## Database

SQLite file at `data/wired.db`. Managed with Drizzle ORM — no raw SQL migrations required.

Key tables:
- `project` — project registry
- `note` — per-project notes
- `project_intelligence_snapshot` — AI scan results
- `project_scan` — persisted local and AI scan summaries
- `note_sync_state` — sync tracking per note
- `user_settings` — global settings (single row)
