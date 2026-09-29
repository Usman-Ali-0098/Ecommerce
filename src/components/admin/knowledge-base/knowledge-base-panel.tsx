"use client";

import { useEffect, useRef, useState } from "react";

type JobItem = {
  id: string;
  status: string;
  message: string | null;
};

type Job = {
  id: string;
  status: string;
  summary: string | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
  items: JobItem[];
};

type Props = {
  chunkCount: number;
  initialJob: Job | null;
};

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "PARTIAL"]);

export default function KnowledgeBasePanel({ chunkCount, initialJob }: Props) {
  const [job, setJob] = useState<Job | null>(initialJob);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guards the one-time "job just finished" notification call below so a
  // re-render (or the poll tick that happens to land exactly on the
  // terminal status) can't fire it twice for the same job.
  const notifiedJobIdRef = useRef<string | null>(null);

  const running = job !== null && !TERMINAL_STATUSES.has(job.status);

  useEffect(() => {
    if (!job || TERMINAL_STATUSES.has(job.status)) return;

    pollRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/jobs/${job.id}`);
        const body = await response.json();
        if (!response.ok || !body.success) return;

        setJob({
          id: body.data.id,
          status: body.data.status,
          summary: body.data.summary,
          error: body.data.error,
          createdAt: job.createdAt,
          finishedAt: job.finishedAt,
          items: body.data.items.map((item: { id: string; status: string; message: string | null }) => ({
            id: item.id,
            status: item.status,
            message: item.message,
          })),
        });

        if (TERMINAL_STATUSES.has(body.data.status)) {
          if (pollRef.current) clearInterval(pollRef.current);

          if (notifiedJobIdRef.current !== body.data.id) {
            notifiedJobIdRef.current = body.data.id;
            void fetch("/api/admin/knowledge/reindex/notify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobId: body.data.id }),
            }).catch(() => {
              // The bell notification is a courtesy -- the resync itself
              // already succeeded or failed regardless of whether this
              // call lands, so a network hiccup here isn't worth surfacing.
            });
          }
        }
      } catch {
        // transient network hiccup — next tick tries again
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, job?.status]);

  async function startResync() {
    setStarting(true);
    setStartError(null);

    try {
      const response = await fetch("/api/admin/knowledge/reindex", { method: "POST" });
      const body = await response.json();

      if (!response.ok || !body.success) {
        setStartError(body.message ?? "Unable to start knowledge base resync.");
        return;
      }

      setJob({
        id: body.data.jobId,
        status: "QUEUED",
        summary: null,
        error: null,
        createdAt: new Date().toISOString(),
        finishedAt: null,
        items: [],
      });
    } catch {
      setStartError("Unable to start knowledge base resync.");
    } finally {
      setStarting(false);
    }
  }

  const completedCount = job?.items.filter((item) => item.status === "COMPLETED").length ?? 0;
  const failedCount = job?.items.filter((item) => item.status === "FAILED").length ?? 0;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {chunkCount.toLocaleString()} indexed {chunkCount === 1 ? "entry" : "entries"}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {job
                ? `Last run ${new Date(job.createdAt).toLocaleString()}`
                : "The knowledge base has never been built."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void startResync()}
            disabled={starting || running}
            className="h-9 shrink-0 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {running ? "Resyncing…" : starting ? "Starting…" : "Resync Knowledge Base"}
          </button>
        </div>

        {startError && <p className="mt-2 text-xs text-red-600">{startError}</p>}
      </div>

      {job && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <StatusPill status={job.status} />
              {running && (
                <span className="text-xs text-gray-500">Processing… this refreshes automatically.</span>
              )}
            </div>
            {job.items.length > 0 && (
              <span className="text-xs text-gray-500">
                {completedCount} succeeded · {failedCount} failed · {job.items.length} total
              </span>
            )}
          </div>

          {job.summary && <p className="mt-2 text-xs text-gray-600">{job.summary}</p>}
          {job.error && <p className="mt-2 text-xs text-red-600">{job.error}</p>}

          {job.items.length > 0 && (
            <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-gray-100">
              <table className="w-full min-w-[420px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {job.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 text-xs text-gray-700 last:border-b-0">
                      <td className="px-4 py-2">
                        <StatusPill status={item.status} />
                      </td>
                      <td className="px-4 py-2">{item.message ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
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
