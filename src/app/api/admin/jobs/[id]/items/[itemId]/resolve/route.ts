import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

const bodySchema = z.object({
  productId: z.string().min(1),
  action: z.enum(["Inserted", "Updated"]),
});

// Called after an admin manually fixes and re-submits a single failed row
// (via the single-product form) from the import job's status page. Flips
// that one JobRunItem from FAILED to COMPLETED and recomputes the JobRun's
// rollup counts/status the same way finalize_job_progress() does on the
// Python side — this is the one place Next.js writes to these tables
// directly, since it's an admin-initiated action the batch pipeline has no
// reason to know about in real time.
export async function POST(request: Request, { params }: RouteContext) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Admin authentication required." }, { status: 401 });
  }

  const { id: jobId, itemId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid request." }, { status: 400 });
  }

  const item = await prisma.jobRunItem.findUnique({ where: { id: itemId } });
  if (!item || item.jobRunId !== jobId) {
    return NextResponse.json({ success: false, message: "Job item not found." }, { status: 404 });
  }
  if (item.status !== "FAILED") {
    return NextResponse.json({ success: false, message: "This row is not in a failed state." }, { status: 409 });
  }

  const { productId, action } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.jobRunItem.update({
      where: { id: itemId },
      data: {
        status: "COMPLETED",
        productId,
        message: `${action} "${item.productName ?? ""}" (manually fixed)`,
      },
    });

    const job = await tx.jobRun.findUniqueOrThrow({ where: { id: jobId } });
    const successCount = job.successCount + 1;
    const failedCount = Math.max(0, job.failedCount - 1);
    const status = failedCount === 0 ? "COMPLETED" : successCount === 0 ? "FAILED" : "PARTIAL";

    await tx.jobRun.update({
      where: { id: jobId },
      data: {
        successCount,
        failedCount,
        status,
        summary: `${successCount}/${job.totalItems} products succeeded.`,
      },
    });
  });

  return NextResponse.json({ success: true });
}
