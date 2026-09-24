import { prisma } from "@/lib/prisma";

export type KnowledgeMatch = {
  id: string;
  sourceType: string;
  sourceId: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

/** Top-K semantic search over KnowledgeChunk. PUBLIC content is visible to
 * everyone; INTERNAL content (admin-only docs -- SOPs, escalation notes,
 * margin notes) is included only when `includeInternal` is true, which the
 * caller sets based on the caller's own role (see route.ts) -- never based
 * on anything in the request body.
 *
 * embedding is Prisma's Unsupported("vector(768)") type, so this can't go
 * through the normal typed client -- raw SQL is the only way to read or
 * compare it. Cosine distance via pgvector's <=> operator; both sides of
 * the comparison are pre-normalized to unit length (see gemini.ts and
 * budget-vibe's tasks_knowledge.py::_normalize), so `1 - distance` is a
 * clean 0..1 similarity score. */
export async function searchKnowledge(
  queryEmbedding: number[],
  { limit = 5, includeInternal = false }: { limit?: number; includeInternal?: boolean } = {},
): Promise<KnowledgeMatch[]> {
  const vectorLiteral = toVectorLiteral(queryEmbedding);
  const visibilities = includeInternal ? ["PUBLIC", "INTERNAL"] : ["PUBLIC"];

  return prisma.$queryRaw<KnowledgeMatch[]>`
    SELECT id, "sourceType", "sourceId", content, metadata,
           1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM "KnowledgeChunk"
    WHERE visibility = ANY(${visibilities})
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `;
}
