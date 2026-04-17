export interface AIConfig {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function createAIResponse(
  config: AIConfig,
  prompt: string,
  system?: string,
  maxTokens = 2048,
  temperature = 0.7
): Promise<AIResponse> {
  if (!config.apiKey || !config.baseUrl) {
    throw new Error("AI provider not configured");
  }

  const messages: { role: "system" | "user"; content: string }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI request failed: ${response.status} ${error}`);
  }

  const data = await response.json() as any;
  return {
    content: data.choices?.[0]?.message?.content || "",
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        }
      : undefined,
  };
}

export type EnhancementMode =
  | "clean_up"
  | "expand"
  | "task_list"
  | "adr"
  | "github_issue"
  | "docs_section"
  | "organize"
  | "summarize"
  | "handoff"
  | "extract_actions";

export const ENHANCEMENT_MODE_DESCRIPTIONS: Record<EnhancementMode, string> = {
  clean_up: "Clean up grammar and formatting",
  expand: "Expand into detailed implementation note",
  task_list: "Convert to task list",
  adr: "Convert to architecture decision record",
  github_issue: "Convert to GitHub issue draft",
  docs_section: "Convert to README/docs section",
  organize: "Organize messy brainstorm",
  summarize: "Summarize into concise bullets",
  handoff: "Turn into developer handoff",
  extract_actions: "Extract action items",
};

export function buildNoteEnhancementPrompt(
  noteType: string,
  mode: EnhancementMode,
  projectContext: string,
  originalNote: string
): string {
  const modeDescriptions: Record<string, string> = {
    clean_up: "Clean up grammar and formatting",
    expand: "Expand into detailed implementation note with technical depth",
    task_list: "Convert into a structured task list with checkbox items",
    adr: "Convert into an Architecture Decision Record (ADR) format",
    github_issue: "Draft as a GitHub issue with title, description, labels, and acceptance criteria",
    docs_section: "Rewrite as a README or documentation section",
    organize: "Reorganize a messy brainstorm into clear sections",
    summarize: "Condense into concise bullet points",
    handoff: "Rewrite as a developer handoff document",
    extract_actions: "Extract clear action items and owners",
  };

  return `# System
You are a senior developer and technical writer. Enhance the user's note.
Preserve original intent. Never invent facts. Return clean Markdown.
Keep original note unchanged. If uncertain, add "Open Questions" section.

# Request
Note type: ${noteType}
Enhancement mode: ${modeDescriptions[mode] || mode}
Project context: ${projectContext || "No project context available"}

# Original Note
${originalNote}

# Output
Return enhanced Markdown only. No preamble, no explanation.`;
}