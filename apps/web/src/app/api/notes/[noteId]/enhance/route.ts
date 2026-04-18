import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Note enhancement modes
const ENHANCEMENT_MODES = [
  "clean_up",        // Grammar and formatting
  "expand",          // Detailed implementation note
  "task_list",       // Convert to task list
  "decision",        // Architecture decision record
  "github_issue",    // GitHub issue draft
  "docs_section",    // README/docs section
  "organize",        // Organize brainstorm
  "summarize",       // Concise bullets
  "handoff",         // Developer handoff
  "action_items",    // Extract action items
] as const;

type EnhancementMode = typeof ENHANCEMENT_MODES[number];

const ENHANCEMENT_PROMPTS: Record<EnhancementMode, string> = {
  clean_up: "Clean up the grammar, formatting, and spelling of this note. Preserve all meaning and intent. Return the improved markdown.",
  expand: "Expand this note into a detailed implementation note. Add relevant context, examples, and technical depth where appropriate. Return markdown.",
  task_list: "Convert this note into a well-structured task list with checkboxes. Extract action items and subtasks. Return markdown.",
  decision: "Convert this note into an Architecture Decision Record (ADR) format. Include: Title, Status, Context, Decision, Consequences. Return markdown.",
  github_issue: "Convert this note into a GitHub issue draft with: Title, Description, Steps to Reproduce (if bug), Expected vs Actual (if bug), Labels suggestion. Return markdown.",
  docs_section: "Convert this note into a README or documentation section. Use clear headings, code examples where relevant. Return markdown.",
  organize: "Organize this messy brainstorm into well-structured, categorized markdown. Preserve all ideas.",
  summarize: "Summarize this note into concise bullet points. Preserve all key information. Return markdown.",
  handoff: "Convert this note into a developer handoff document. Include: What was done, What needs to be done, Key decisions, Important context. Return markdown.",
  action_items: "Extract all action items, open questions, and follow-up tasks from this note. Return a structured list.",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params;
    const db = getDb();
    const body = await request.json();
    const { mode = "clean_up", projectContext } = body as {
      mode?: EnhancementMode;
      projectContext?: string;
    };

    const note = db.prepare("SELECT * FROM note WHERE id = ?").get(noteId) as {
      id: string;
      title: string;
      body_markdown: string;
      project_id: string;
    } | undefined;

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (!ENHANCEMENT_MODES.includes(mode)) {
      return NextResponse.json({ error: `Invalid mode. Must be one of: ${ENHANCEMENT_MODES.join(", ")}` }, { status: 400 });
    }

    const apiKey = process.env.AI_API_KEY;
    const aiBaseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
    const aiModel = process.env.AI_MODEL || "gpt-4o-mini";

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI not configured. Set AI_API_KEY to enable note enhancement." },
        { status: 400 },
      );
    }

    const systemPrompt = `You are a senior technical writer and developer assistant. You help users clean up, expand, and organize their project notes. Always preserve the user's original intent and meaning. Never invent facts about the project. Return clean markdown.`;

    const userPrompt = `${projectContext ? `Project context:\n${projectContext}\n\n` : ""}Enhancement mode: ${mode.replace("_", " ")}
Prompt: ${ENHANCEMENT_PROMPTS[mode]}

Original note:
# ${note.title}

${note.body_markdown}`;

    const response = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI API error:", error);
      return NextResponse.json({ error: "AI enhancement failed", details: error }, { status: 502 });
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const enhanced = data.choices[0]?.message?.content || note.body_markdown;

    return NextResponse.json({ enhanced, mode, noteId });
  } catch (error) {
    console.error("POST /api/notes/[noteId]/enhance error:", error);
    return NextResponse.json({ error: "Failed to enhance note" }, { status: 500 });
  }
}
