import KnowledgeBasePanel from "@/components/admin/knowledge-base/knowledge-base-panel";
import { prisma } from "@/lib/prisma";

export default async function KnowledgeBasePage() {
  const [lastJob, chunkCount] = await Promise.all([
    prisma.jobRun.findFirst({
      where: { type: "KNOWLEDGE_INDEX" },
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.knowledgeChunk.count(),
  ]);

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Knowledge Base</h1>
        <p className="mt-1 text-sm text-gray-500">
          The product, category, and policy data the chatbot answers from. Resync it after bulk
          edits so it stops referencing stale information.
        </p>
      </div>

      <KnowledgeBasePanel
        chunkCount={chunkCount}
        initialJob={
          lastJob
            ? {
                id: lastJob.id,
                status: lastJob.status,
                summary: lastJob.summary,
                error: lastJob.error,
                createdAt: lastJob.createdAt.toISOString(),
                finishedAt: lastJob.finishedAt?.toISOString() ?? null,
                items: lastJob.items.map((item) => ({
                  id: item.id,
                  status: item.status,
                  message: item.message,
                })),
              }
            : null
        }
      />
    </section>
  );
}
