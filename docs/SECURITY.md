# Wired — Security

## Threat Model

Wired is a self-hosted application. The primary trust boundary is the server it runs on.

## Data Storage

- **SQLite database** — stored at `data/wired.db` with filesystem permissions
- **API keys** — stored in `user_settings` table, never returned by GET /api/settings
- **GitHub tokens** — stored in `user_settings`, never exposed to the frontend
- **No cloud sync** — all data stays on your server

## External Access

- Wired should only be accessible on a trusted network or behind a reverse proxy with authentication
- The Tauri desktop app can target either a local Wired server or a remote Wired deployment URL
- CORS is not configured for cross-origin requests
- Remote scan triggering can be gated with `SCAN_TRIGGER_TOKEN`

## AI API Keys

- Sent only to the configured AI provider endpoint
- Never stored in logs
- Never returned by any API endpoint

## GitHub Tokens

- Stored locally in SQLite
- Used only for GitHub API calls (repo listing, branch fetching, metadata)
- Never exposed to the browser

## Scan Trigger Tokens

- `POST /api/projects/:id/scan` stays open by default for local/self-hosted use
- If `SCAN_TRIGGER_TOKEN` is set, the route requires either `Authorization: Bearer <token>` or `X-Wired-Scan-Token`
- The desktop app stores its optional remote trigger token locally on the client and only sends it on remote scan requests

## Input Sanitization

- All user input is validated at the API layer before database writes
- Markdown content is rendered server-side with sanitization
- File paths are resolved safely (no path traversal)
