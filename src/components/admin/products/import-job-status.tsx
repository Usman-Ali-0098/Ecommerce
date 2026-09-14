"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type JobItem = {
  id: string;
  rowIndex: number | null;
  status: string;
  message: string | null;
  productId: string | null;
};

type Props = {
  jobId: string;
  initialStatus: string;
  initialSummary: string | null;
  initialError: string | null;
  initialItems: JobItem[];
};

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "PARTIAL"]);

export default function ImportJobStatus({
  jobId,
  initialStatus,
  initialSummary,
  initialError,
  initialItems,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState(initialError);
  const [items, setItems] = useState(initialItems);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(status)) return;

    pollRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/jobs/${jobId}`);
        const body = await response.json();
        if (!response.ok || !body.success) return;

        setStatus(body.data.status);
        setSummary(body.data.summary);
        setError(body.data.error);
        setItems(body.data.items);

        if (TERMINAL_STATUSES.has(body.data.status) && pollRef.current) {
          clearInterval(pollRef.current);
        }
      } catch {
        // transient network hiccup — next tick tries again
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId, status]);

  const completedCount = items.filter((item) => item.status === "COMPLETED").length;
  const failedCount = items.filter((item) => item.status === "FAILED").length;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusPill status={status} />
            {!TERMINAL_STATUSES.has(status) && (
              <span className="text-xs text-gray-500">Processing… this refreshes automatically.</span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {completedCount} succeeded · {failedCount} failed · {items.length} total
          </span>
        </div>
        {summary && <p className="mt-2 text-xs text-gray-600">{summary}</p>}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-150 border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2.5">Row</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Result</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 text-xs text-gray-700 last:border-b-0">
                <td className="px-4 py-2.5">{item.rowIndex !== null ? item.rowIndex + 1 : "—"}</td>
                <td className="px-4 py-2.5">
                  <StatusPill status={item.status} />
                </td>
                <td className="px-4 py-2.5">
                  {item.productId ? (
                    <Link href={`/admin/products/${item.productId}/edit`} className="text-blue-600 hover:underline">
                      {item.message ?? "View product"}
                    </Link>
                  ) : (
                    item.message ?? "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
