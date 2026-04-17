# Wired — Note Sync Specification

## Overview

Notes are synced as Markdown files with YAML frontmatter into a configurable folder in the project's repository (default: `.wired/notes/`).

## File Naming

```
YYYY-MM-DD-{slugified-title}.md
```

Example: `2026-04-17-project-architecture-notes.md`

## Frontmatter Schema

```yaml
---
wired_note_id: "abc123..."
project_id: "proj_xyz..."
title: "Project architecture decisions"
type: "architecture_note"
tags: ["design", "backend"]
status: "draft"
created_at: "2026-04-17T10:00:00.000Z"
updated_at: "2026-04-17T14:30:00.000Z"
synced_at: "2026-04-17T15:00:00.000Z"
source: "Wired"
---
```

## Sync Modes

| Mode | Write file | Git stage | Git commit |
|------|-----------|-----------|------------|
| `write_only` | ✅ | ❌ | ❌ |
| `write_stage` | ✅ | ✅ | ❌ |
| `write_stage_commit` | ✅ | ✅ | ✅ |

**Auto-push is never enabled.** Commits are local only.

## Conflict Detection

Conflicts are detected by comparing content hashes:

1. `app_hash` — hash of content Wired last wrote
2. `repo_hash` — hash of what's currently in the repo file
3. If `repo_hash` differs from `app_hash` and differs from `previous_synced_hash`, a conflict is flagged

## Conflict Resolution Options

| Choice | Action |
|--------|--------|
| Keep app | Overwrite repo file with app content |
| Keep repo | Update app to match repo file |
| Merge | Keep repo file, flag note for review |
| Duplicate | Keep both — app as-is, repo as `conflict_copy.md` |

## Sync Triggers

- Manual: click "Sync" in the note editor or sync panel
- Auto: notes can be configured to sync on save (Phase 5+)
