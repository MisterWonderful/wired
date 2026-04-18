# Wired

> Self-hosted project intelligence and notes for developers.

**Wired** helps you understand, continue, and document your active projects. It scans local folders and GitHub repositories, generates AI-powered project intelligence, and maintains a per-project note system with Markdown sync.

![Wired](https://img.shields.io/badge/status-beta-blue) ![License MIT](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Project Registry** — Add projects from local folders, GitHub repos, or manually
- **AI Project Intelligence** — Scans your codebase to understand project state, release readiness %, completeness %, and where you left off
- **Smart Notes** — Per-project notes with 11 types, markdown editor, AI enhancement, and auto-sync to `.wired/notes/`
- **Git Awareness** — Tracks branch, commits, dirty files, and recent changes
- **Desktop Scan Trigger** — Mini Tauri app can trigger standardized local or AI scans against a local Wired server or a remote deployment
- **Sync Engine** — Writes notes as Markdown with frontmatter to your repo, with conflict detection
- **Clean UI** — Apple-like minimal design, mobile-friendly, light and dark mode

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+ via Corepack
- SQLite (included via `better-sqlite3`)

### Local Development

```bash
git clone https://github.com/your-username/wired.git
cd wired
corepack pnpm install

# Seed demo data
corepack pnpm seed

# Start dev server
corepack pnpm --filter @wired/web dev
```

Open [http://localhost:3008](http://localhost:3008)

### Docker

```bash
# Build
docker compose build

# Run
docker compose up -d

# Open
open http://localhost:3000
```

### Desktop App (Tauri)

```bash
cd apps/desktop
corepack pnpm install
corepack pnpm tauri dev
```

The desktop app reads projects from the same SQLite database and can trigger scans against:
- a local Wired server such as `http://127.0.0.1:3008`
- a remote Wired deployment URL

---

## Configuration

Copy `.env.example` to `.env.local` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./data/wired.db` | SQLite database path (repo-root `data/wired.db` by default in local dev) |
| `PORT` | `3008` | Server port |
| `AI_API_KEY` | — | OpenAI-compatible API key |
| `AI_BASE_URL` | `https://api.openai.com/v1` | AI provider base URL |
| `AI_MODEL` | `gpt-4o-mini` | AI model name |
| `GITHUB_TOKEN` | — | GitHub personal access token |
| `SCAN_TRIGGER_TOKEN` | — | Optional token required by `POST /api/projects/:id/scan` for remote trigger clients |

---

## Architecture

```
/Wired
 /apps
  /web          — Next.js 15 web app (this is what runs)
  /desktop      — Tauri v2 Mac desktop app (optional)
 /packages
  /core         — Shared TypeScript types
  /db           — Drizzle ORM schema + SQLite client
  /git          — simple-git wrappers
  /ai           — AI provider abstraction
  /sync         — Markdown sync engine
  /scanner      — Directory scan + file ranking
  /ui           — Shared UI utilities
 /docs
  ARCHITECTURE.md
  SECURITY.md
  SYNC_SPEC.md
```

### Database

10 SQLite tables: `project`, `note`, `user_settings`, `project_intelligence_snapshot`, `project_scan`, `note_sync_state`, `activity_event`, and more.

### Scan Triggering

Wired now exposes a stable trigger route for scan clients:

- `POST /api/projects/:id/scan` with `{ "type": "local" | "ai" }`

The response is standardized and includes scan metadata, git summary, file summary, optional TODOs, optional AI intelligence payload, and persistence flags indicating whether the result is website-ready.

If `SCAN_TRIGGER_TOKEN` is configured, trigger clients may authenticate with either:

- `Authorization: Bearer <token>`
- `X-Wired-Scan-Token: <token>`

---

## License

MIT © Your Name
