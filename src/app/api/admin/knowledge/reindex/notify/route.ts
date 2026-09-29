import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/admin-auth";
import { publishNotificationUpdate } from "@/lib/notifications/socket-server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/validate-request";

const notifyRequestSchema = z.object({
  jobId: z.string().min(1),
});

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "PARTIAL"]);

/** The jobs service (budget-vibe's Celery worker) has no way to reach this
 * app's in-process Socket.IO server directly, so there's no live push when
 * a reindex job finishes -- only this Next.js app's own DB is the shared
 * source of truth (see GET /api/admin/jobs/[id]). Rather than adding a new
 * cross-service channel, the browser that's already polling that route for
 * status calls this once it observes the job reach a terminal state; this
 * route re-checks that status itself (never trusts the client's word for
 * it) before writing the admin notification, so it can only ever fire for
 * a job that's genuinely finished. */
export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin authentication required." },
        { status: 401 },
      );
    }

    const validation = validateRequest(notifyRequestSchema, await request.json());
    if (!validation.success) return validation.response;

    const job = await prisma.jobRun.findUnique({
      where: { id: validation.data.jobId, type: "KNOWLEDGE_INDEX" },
    });

    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found." }, { status: 404 });
    }

    if (!TERMINAL_STATUSES.has(job.status)) {
      return NextResponse.json(
        { success: false, message: "Job has not finished yet." },
        { status: 409 },
      );
    }

    const failed = job.status === "FAILED";

    await prisma.adminNotification.create({
      data: {
        type: "KNOWLEDGE_REINDEX",
        title: failed ? "Knowledge base resync failed" : "Knowledge base resync complete",
        message:
          job.error ??
          job.summary ??
          (failed
            ? "The chatbot's knowledge base resync failed. Check the job for details."
            : "The chatbot's product, category, and policy knowledge is now up to date."),
      },
    });

    publishNotificationUpdate({ notifyAdmins: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Knowledge reindex notify error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to record job completion." },
      { status: 500 },
    );
  }
}
