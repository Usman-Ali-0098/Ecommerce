import Link from "next/link";

import { prisma } from "@/lib/prisma";

export default async function ProductImportHistoryPage() {
  const jobs = await prisma.jobRun.findMany({
    where: { type: "PRODUCT_IMPORT" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      createdAt: true,
      originalFilename: true,
      totalItems: true,
      successCount: true,
      failedCount: true,
    },
  });

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Product Imports</h1>
          <p className="mt-1 text-sm text-gray-500">History of bulk CSV product imports.</p>
        </div>
        <Link
          href="/admin/products"
          className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700"
        >
          Start a new import
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-gray-700">No imports yet.</p>
          <p className="mt-1 text-xs text-gray-500">
            Uploads started from the Products page will show up here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-150 border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2.5">File</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Started</th>
                <th className="px-4 py-2.5">Result</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-gray-100 text-xs text-gray-700 last:border-b-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/products/import/${job.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {job.originalFilename ?? `Job ${job.id.slice(0, 8)}`}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={job.status} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {job.createdAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {job.totalItems > 0
                      ? `${job.successCount} succeeded · ${job.failedCount} failed · ${job.totalItems} total`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    QUEUED: "bg-gray-100 text-gray-600",
    PROCESSING: "bg-amber-50 text-amber-700",
    COMPLETED: "bg-green-50 text-green-700",
    PARTIAL: "bg-amber-50 text-amber-700",
    FAILED: "bg-red-50 text-red-700",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
