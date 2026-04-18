import test from "node:test";
import assert from "node:assert/strict";

import { buildNoteFileName, buildNoteFrontmatter, detectConflict, resolveConflict } from "./index.js";

test("detectConflict is false on first sync without a previous repo hash", () => {
  assert.equal(detectConflict("app-hash", null, "repo-hash"), false);
});

test("detectConflict is false when the repo changed to the same content as the app", () => {
  assert.equal(detectConflict("app-hash", "old-repo-hash", "app-hash"), false);
});

test("detectConflict is true when the repo diverged from both the previous repo hash and the app hash", () => {
  assert.equal(detectConflict("app-hash", "old-repo-hash", "new-repo-hash"), true);
});

test("resolveConflict keep_app returns app content", () => {
  assert.deepEqual(
    resolveConflict("app content", "repo content", "keep_app"),
    { content: "app content", path: "app_version.md" },
  );
});

test("resolveConflict keep_repo returns repo content", () => {
  assert.deepEqual(
    resolveConflict("app content", "repo content", "keep_repo"),
    { content: "repo content", path: "repo_version.md" },
  );
});

test("buildNote helpers accept raw snake_case note rows from SQLite routes", () => {
  const fileName = buildNoteFileName({
    title: "Architecture Notes",
    created_at: "2026-04-17T10:00:00.000Z",
  });
  const frontmatter = buildNoteFrontmatter({
    id: "note-1",
    project_id: "project-1",
    title: "Architecture Notes",
    note_type: "architecture_note",
    tags: ["design"],
    status: "draft",
    created_at: "2026-04-17T10:00:00.000Z",
    updated_at: "2026-04-17T10:15:00.000Z",
    synced_at: "2026-04-17T10:20:00.000Z",
  });

  assert.equal(fileName, "2026-04-17-architecture-notes.md");
  assert.match(frontmatter, /project_id: "project-1"/);
  assert.match(frontmatter, /type: "architecture_note"/);
  assert.match(frontmatter, /created_at: "2026-04-17T10:00:00.000Z"/);
});
