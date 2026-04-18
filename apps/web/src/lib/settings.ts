export interface StoredSettingsRecord {
  id: string | null;
  ai_provider: string | null;
  ai_base_url: string | null;
  ai_model: string | null;
  ai_api_key?: string | null;
  github_token?: string | null;
  default_sync_folder: string | null;
  default_sync_mode: string | null;
  theme: string | null;
}

export interface PublicSettings {
  id: string | null;
  ai_provider: string;
  ai_base_url: string;
  ai_model: string;
  default_sync_folder: string;
  default_sync_mode: string;
  theme: string;
  has_ai_api_key: boolean;
  has_github_token: boolean;
}

export interface SettingsPatch {
  publicFields: Record<string, string>;
  aiApiKey?: string | null;
  githubToken?: string | null;
}

export function serializePublicSettings(settings?: Partial<StoredSettingsRecord> | null): PublicSettings {
  return {
    id: settings?.id ?? null,
    ai_provider: settings?.ai_provider || "openai",
    ai_base_url: settings?.ai_base_url || "https://api.openai.com/v1",
    ai_model: settings?.ai_model || "gpt-4o-mini",
    default_sync_folder: settings?.default_sync_folder || ".wired/notes",
    default_sync_mode: settings?.default_sync_mode || "write_only",
    theme: settings?.theme || "system",
    has_ai_api_key: Boolean(settings?.ai_api_key),
    has_github_token: Boolean(settings?.github_token),
  };
}

export function buildSettingsPatch(body: Record<string, unknown>): SettingsPatch {
  const publicFields: Record<string, string> = {};
  for (const key of [
    "ai_provider",
    "ai_base_url",
    "ai_model",
    "default_sync_folder",
    "default_sync_mode",
    "theme",
  ]) {
    const value = body[key];
    if (typeof value === "string") {
      publicFields[key] = value;
    }
  }

  const patch: SettingsPatch = { publicFields };

  if ("ai_api_key" in body) {
    patch.aiApiKey = normalizeSecretValue(body.ai_api_key);
  }
  if ("github_token" in body) {
    patch.githubToken = normalizeSecretValue(body.github_token);
  }

  return patch;
}

function normalizeSecretValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value === "" ? null : value;
}
