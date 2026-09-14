import Link from "next/link";
import { notFound } from "next/navigation";

import ImportJobStatus from "@/components/admin/products/import-job-status";
import { prisma } from "@/lib/prisma";

type ImportJobPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function ImportJobPage({ params }: ImportJobPageProps) {
  const { jobId } = await params;

  const job = await prisma.jobRun.findUnique({
    where: { id: jobId, type: "PRODUCT_IMPORT" },
    include: { items: { orderBy: { rowIndex: "asc" } } },
  });

  if (!job) {
    notFound();
  }

  return (
    <section>
      <div className="mb-6 flex items-center gap-2.5">
        <Link
          href="/admin/products"
          aria-label="Back to products"
          className="flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition hover:bg-blue-50"
        >
          <span className="text-lg">←</span>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Product Import</h1>
          <p className="mt-1 text-sm text-gray-500">
            Job {job.id.slice(0, 8)} · started {new Date(job.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <ImportJobStatus
        jobId={job.id}
        initialStatus={job.status}
        initialSummary={job.summary}
        initialError={job.error}
        initialItems={job.items.map((item) => ({
          id: item.id,
          rowIndex: item.rowIndex,
          status: item.status,
          message: item.message,
          productId: item.productId,
        }))}
      />
    </section>
  );
}
