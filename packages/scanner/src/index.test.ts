import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildContextBundle, rankFiles, scanDirectory } from "./index.js";

test("scanDirectory returns root-relative paths and stable absolute paths for nested files", () => {
  const root = mkdtempSync(path.join(tmpdir(), "wired-scanner-"));
  const nestedDir = path.join(root, "src", "nested");
  const nestedFile = path.join(nestedDir, "feature.ts");

  try {
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(nestedFile, "export const feature = true;\n");

    const candidates = scanDirectory(root, 20, 10_000);
    const candidate = candidates.find((entry) => entry.path === "src/nested/feature.ts");

    assert.ok(candidate);
    assert.equal(candidate.absolutePath, nestedFile);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("scanDirectory detects TODO markers in file contents", () => {
  const root = mkdtempSync(path.join(tmpdir(), "wired-scanner-"));
  const filePath = path.join(root, "src", "todo.ts");

  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, "// TODO: repair this path bug\n");

    const candidates = scanDirectory(root, 20, 10_000);
    const candidate = candidates.find((entry) => entry.path === "src/todo.ts");

    assert.ok(candidate);
    assert.equal(candidate.containsTodo, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildContextBundle reads nested files using their absolute paths", () => {
  const root = mkdtempSync(path.join(tmpdir(), "wired-scanner-"));
  const filePath = path.join(root, "src", "deep", "component.tsx");

  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, "export const DeepComponent = () => 'nested';\n");

    const ranked = rankFiles(scanDirectory(root, 20, 10_000));
    const bundle = buildContextBundle(ranked, 2_000);

    assert.match(bundle, /src\/deep\/component\.tsx/);
    assert.match(bundle, /DeepComponent/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
