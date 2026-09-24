import {
  GoogleGenAI,
  ApiError,
  type Content,
  type FunctionDeclaration,
  type GenerateContentConfig,
  type GenerateContentResponse,
} from "@google/genai";

let client: GoogleGenAI | null = null;

export class GeminiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiConfigurationError";
  }
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new GeminiConfigurationError(
      "GEMINI_API_KEY is not configured.",
    );
  }

  client ??= new GoogleGenAI({ apiKey });

  return client;
}

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIM = 768;
const CHAT_MODEL = "gemini-flash-lite-latest";

function normalize(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? values : values.map((v) => v / norm);
}

/** Embeds a user's chat message for similarity search against
 * KnowledgeChunk.embedding. RETRIEVAL_QUERY is deliberately different from
 * the RETRIEVAL_DOCUMENT task type budget-vibe's ingestion job uses --
 * Gemini's embeddings are asymmetric by design, shaped for query<->document
 * matching rather than identical text embedded the same way on both sides.
 * Must stay at EMBEDDING_DIM = 768 to match the KnowledgeChunk.embedding
 * column (vector(768)). */
export async function embedQuery(text: string): Promise<number[]> {
  const ai = getClient();

  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: EMBEDDING_DIM,
      taskType: "RETRIEVAL_QUERY",
    },
  });

  const values = response.embeddings?.[0]?.values;

  if (!values) {
    throw new GeminiConfigurationError("Gemini returned no embedding for the query.");
  }

  // gemini-embedding-001 only guarantees unit length at its full 3072-dim
  // output; a truncated 768-dim vector needs renormalizing here so
  // pgvector's cosine-distance operator (<=>) ranks results correctly --
  // mirrors budget-vibe's app/tasks_knowledge.py::_normalize on the
  // indexing side.
  return normalize(values);
}

export type ChatTurn = { role: "user" | "model"; text: string };

export type ToolCallRecord = {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
};

const MAX_TOOL_ROUNDS = 4;

// The free-tier quota for gemini-3.6-flash is a tight 5 requests/minute per
// project (discovered while testing Step 5 -- a burst of test messages, each
// costing multiple generateContent calls via the tool-calling loop, hit it
// within seconds). 429 (quota) and 503 (transient overload) are both worth
// a short retry; anything else fails immediately, unretried.
const RETRY_DELAYS_MS = [2000, 5000, 15000];

async function generateContentWithRetry(
  ai: GoogleGenAI,
  contents: Content[],
  config: GenerateContentConfig,
): Promise<GenerateContentResponse> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await ai.models.generateContent({ model: CHAT_MODEL, contents, config });
    } catch (error) {
      const retryable = error instanceof ApiError && (error.status === 429 || error.status === 503);
      if (!retryable || attempt >= RETRY_DELAYS_MS.length) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}

/** One call = one assistant reply, optionally after Gemini calls one or
 * more tools. `history` is prior turns in this session (oldest first),
 * `message` is the new user turn. The caller builds systemInstruction
 * (persona + retrieved <context>), decides which `tools` (if any) this
 * session's role is allowed, supplies `executeTool` to actually run one,
 * and persists the exchange afterward -- this function itself is
 * stateless between calls.
 *
 * Gemini's function-calling protocol only has "user"/"model" roles: a tool
 * result is sent back as a "user" turn containing a `functionResponse`
 * part, not a separate "tool" role, even though this app's own
 * ChatMessage.role enum does have a TOOL value for persistence. */
export async function generateChatReply({
  systemInstruction,
  history,
  message,
  tools,
  executeTool,
}: {
  systemInstruction: string;
  history: ChatTurn[];
  message: string;
  tools?: FunctionDeclaration[];
  executeTool?: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}): Promise<{ text: string; toolCalls: ToolCallRecord[] }> {
  const ai = getClient();

  const contents: Content[] = [
    ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: "user" as const, parts: [{ text: message }] },
  ];

  const toolCalls: ToolCallRecord[] = [];
  const config = tools?.length
    ? { systemInstruction, tools: [{ functionDeclarations: tools }] }
    : { systemInstruction };

  let round = 0;

  while (true) {
    const response = await generateContentWithRetry(ai, contents, config);

    const calls = response.functionCalls;

    if (!calls || calls.length === 0 || !executeTool) {
      return { text: response.text ?? "", toolCalls };
    }

    round += 1;

    // Append the model's own turn (the function call parts) so the next
    // round has full context of what it asked for.
    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) {
      contents.push(modelContent);
    }

    const responseParts = [];
    for (const call of calls) {
      const name = call.name ?? "";
      const args = call.args ?? {};
      const result = await executeTool(name, args);
      toolCalls.push({ name, args, result });
      responseParts.push({ functionResponse: { name, response: result } });
    }
    contents.push({ role: "user" as const, parts: responseParts });

    if (round >= MAX_TOOL_ROUNDS) {
      // Safety valve against a runaway tool-call loop: stop offering tools
      // and force a final plain-text answer from whatever's been gathered
      // so far, rather than looping indefinitely.
      const final = await generateContentWithRetry(ai, contents, { systemInstruction });
      return { text: final.text ?? "", toolCalls };
    }
  }
}
