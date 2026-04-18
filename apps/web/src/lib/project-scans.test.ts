import test from "node:test";
import assert from "node:assert/strict";
import { extractJsonObject, resolveAiRuntimeConfig, ScanServiceError } from "./project-scans";

test("resolveAiRuntimeConfig prefers stored settings over environment values", () => {
  const config = resolveAiRuntimeConfig(
    {
      ai_provider: "openai",
      ai_base_url: "https://custom.example/v1",
      ai_model: "gpt-test",
      ai_api_key: "db-key",
    },
    {
      AI_PROVIDER: "env-provider",
      AI_BASE_URL: "https://env.example/v1",
      AI_MODEL: "env-model",
      AI_API_KEY: "env-key",
    } as unknown as NodeJS.ProcessEnv,
  );

  assert.deepEqual(config, {
    provider: "openai",
    baseUrl: "https://custom.example/v1",
    model: "gpt-test",
    apiKey: "db-key",
  });
});

test("resolveAiRuntimeConfig falls back to environment when no stored key exists", () => {
  const config = resolveAiRuntimeConfig(
    {
      ai_provider: null,
      ai_base_url: null,
      ai_model: null,
      ai_api_key: null,
    },
    {
      AI_API_KEY: "env-key",
    } as unknown as NodeJS.ProcessEnv,
  );

  assert.deepEqual(config, {
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKey: "env-key",
  });
});

test("extractJsonObject pulls a JSON object out of mixed AI output", () => {
  const parsed = extractJsonObject("Here is the result:\n{\"projectDescription\":\"Demo\",\"releaseReadinessPercent\":42}");
  assert.equal(parsed.projectDescription, "Demo");
  assert.equal(parsed.releaseReadinessPercent, 42);
});

test("extractJsonObject throws a route-safe error on invalid output", () => {
  assert.throws(
    () => extractJsonObject("No JSON here"),
    (error: unknown) => error instanceof ScanServiceError && error.status === 502,
  );
});
