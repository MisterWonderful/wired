import test from "node:test";
import assert from "node:assert/strict";

import { buildSettingsPatch, serializePublicSettings } from "./settings.js";

test("serializePublicSettings redacts secrets and exposes presence flags", () => {
  const serialized = serializePublicSettings({
    id: "settings-1",
    ai_provider: "openai",
    ai_base_url: "https://api.openai.com/v1",
    ai_model: "gpt-4o-mini",
    ai_api_key: "sk-secret",
    github_token: "ghp-secret",
    default_sync_folder: ".wired/notes",
    default_sync_mode: "write_only",
    theme: "system",
  });

  assert.equal("ai_api_key" in serialized, false);
  assert.equal("github_token" in serialized, false);
  assert.equal(serialized.has_ai_api_key, true);
  assert.equal(serialized.has_github_token, true);
});

test("buildSettingsPatch treats empty secret inputs as explicit clears", () => {
  const patch = buildSettingsPatch({
    ai_provider: "anthropic",
    ai_api_key: "",
    github_token: "",
    theme: "dark",
  });

  assert.equal(patch.publicFields.ai_provider, "anthropic");
  assert.equal(patch.publicFields.theme, "dark");
  assert.equal(patch.aiApiKey, null);
  assert.equal(patch.githubToken, null);
});
