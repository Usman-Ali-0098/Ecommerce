"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

type JobItem = {
  id: string;
  rowIndex: number | null;
  chunkIndex: number | null;
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
  initialPhase: string | null;
  initialTotalRows: number;
  initialTotalItems: number;
  initialProcessedItems: number;
  initialSuccessCount: number;
  initialFailedCount: number;
};

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "PARTIAL"]);

export default function ImportJobStatus({
  jobId,
  initialStatus,
  initialSummary,
  initialError,
  initialItems,
  initialPhase,
  initialTotalRows,
  initialTotalItems,
  initialProcessedItems,
  initialSuccessCount,
  initialFailedCount,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState(initialError);
  const [items, setItems] = useState(initialItems);
  const [phase, setPhase] = useState(initialPhase);
  const [progress, setProgress] = useState({
    totalRows: initialTotalRows,
    totalItems: initialTotalItems,
    processedItems: initialProcessedItems,
    successCount: initialSuccessCount,
    failedCount: initialFailedCount,
  });
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
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
        setPhase(body.data.phase);
        setProgress({
          totalRows: body.data.totalRows,
          totalItems: body.data.totalItems,
          processedItems: body.data.processedItems,
          successCount: body.data.successCount,
          failedCount: body.data.failedCount,
        });

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

  const completedCount = progress.totalItems ? progress.successCount : items.filter((item) => item.status === "COMPLETED").length;
  const failedCount = progress.totalItems ? progress.failedCount : items.filter((item) => item.status === "FAILED").length;
  const insertedCount = items.filter(
    (item) => item.status === "COMPLETED" && /^(Created|Inserted)\b/i.test(item.message ?? ""),
  ).length;
  const updatedCount = items.filter(
    (item) => item.status === "COMPLETED" && /^Updated\b/i.test(item.message ?? ""),
  ).length;
  const percent = progress.totalItems ? Math.min(100, Math.round((progress.processedItems / progress.totalItems) * 100)) : 0;

  // Older jobs (imported before chunkIndex existed) have it null on every
  // item — fall back to one flat list instead of a single misleading
  // "Chunk —" group.
  const hasChunkData = items.some((item) => item.chunkIndex !== null);

  const chunks = useMemo(() => {
    if (!hasChunkData) return [];
    const groups = new Map<number, JobItem[]>();
    for (const item of items) {
      const key = item.chunkIndex ?? -1;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [items, hasChunkData]);

  function toggleChunk(chunkKey: number) {
    setExpandedChunks((current) => {
      const next = new Set(current);
      if (next.has(chunkKey)) next.delete(chunkKey);
      else next.add(chunkKey);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusPill status={status} />
            {!TERMINAL_STATUSES.has(status) && (
              <span className="text-xs text-gray-500">{phase ? `${phase.replaceAll("_", " ")} · ` : ""}Refreshing automatically.</span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {completedCount} succeeded ({insertedCount} inserted, {updatedCount} updated) · {failedCount} failed · {progress.totalItems || items.length} products
          </span>
        </div>
        {progress.totalItems > 0 ? (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-gray-500">
              <span>{progress.processedItems} of {progress.totalItems} products processed</span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${percent}%` }} />
            </div>
            {progress.totalRows > 0 ? <p className="mt-1 text-[11px] text-gray-400">Parsed {progress.totalRows} CSV rows.</p> : null}
          </div>
        ) : null}
        {summary && <p className="mt-2 text-xs text-gray-600">{summary}</p>}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {hasChunkData ? (
        <div className="space-y-2">
          {chunks.map(([chunkKey, chunkItems]) => {
            const isExpanded = expandedChunks.has(chunkKey);
            const chunkSucceeded = chunkItems.filter((item) => item.status === "COMPLETED").length;
            const chunkFailed = chunkItems.filter((item) => item.status === "FAILED").length;
            const label = chunkKey === -1 ? "Unassigned rows" : `Chunk ${chunkKey + 1}`;

            return (
              <div key={chunkKey} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => toggleChunk(chunkKey)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {chunkItems.length} products · {chunkSucceeded} succeeded · {chunkFailed} failed
                  </span>
                </button>
                {isExpanded ? (
                  <div className="border-t border-gray-100">
                    <ItemsTable items={chunkItems} jobId={jobId} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <ItemsTable items={items} jobId={jobId} />
        </div>
      )}

      <p className="text-xs text-gray-500">
        Products are matched by SKU. “Inserted” means a new product was added; “Updated” means an existing product was changed.
      </p>
    </div>
  );
}

function ItemsTable({ items, jobId }: { items: JobItem[]; jobId: string }) {
  return (
    <table className="w-full min-w-150 border-collapse">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          <th className="px-4 py-2.5">Row</th>
          <th className="px-4 py-2.5">Status</th>
          <th className="px-4 py-2.5">Result</th>
          <th className="px-4 py-2.5" />
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
                  {item.message?.replace(/^Created\b/i, "Inserted") ?? "View product"}
                </Link>
              ) : (
                item.message?.replace(/^Created\b/i, "Inserted") ?? "—"
              )}
            </td>
            <td className="px-4 py-2.5 text-right">
              {item.status === "FAILED" ? (
                <Link
                  href={`/admin/products/import/${jobId}/retry/${item.id}`}
                  className="font-medium text-amber-700 hover:underline"
                >
                  Fix &amp; Retry
                </Link>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
