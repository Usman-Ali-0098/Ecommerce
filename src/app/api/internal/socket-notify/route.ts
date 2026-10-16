import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { publishNotificationUpdate } from "@/lib/notifications/socket-server";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ jobRunId: z.string().min(1).max(100) });
const TERMINAL_STATUSES = new Set(["COMPLETED", "PARTIAL", "FAILED"]);

function hasValidJobsSecret(request: Request) {
  const secret = process.env.JOBS_API_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || !authorization.startsWith("Bearer ")) return false;
  const received = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  if (!process.env.JOBS_API_SECRET) {
    return NextResponse.json({ success: false, message: "Jobs service authentication is not configured." }, { status: 503 });
  }
  if (!hasValidJobsSecret(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized jobs service request." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid job notification payload." }, { status: 400 });
  }

  try {
    const job = await prisma.jobRun.findUnique({
      where: { id: parsed.data.jobRunId, type: "PRODUCT_IMPORT" },
      select: {
        id: true,
        status: true,
        summary: true,
        error: true,
        successCount: true,
        failedCount: true,
      },
    });
    if (!job) {
      return NextResponse.json({ success: false, message: "Product import job not found." }, { status: 404 });
    }
    if (!TERMINAL_STATUSES.has(job.status)) {
      return NextResponse.json({ success: false, message: "Product import job is not complete." }, { status: 409 });
    }

    const failed = job.status === "FAILED";
    const message = job.error ?? job.summary ??
      `${job.successCount} product(s) imported; ${job.failedCount} failed.`;
    const notification = await prisma.adminNotification.upsert({
      where: { jobRunId: job.id },
      create: {
        jobRunId: job.id,
        type: "PRODUCT_IMPORT",
        title: failed ? "Bulk product import failed" : "Bulk product import complete",
        message,
      },
      update: {
        title: failed ? "Bulk product import failed" : "Bulk product import complete",
        message,
      },
      select: { id: true },
    });

    publishNotificationUpdate({ notifyAdmins: true });
    return NextResponse.json({ success: true, data: { notificationId: notification.id } });
  } catch (error) {
    console.error("Internal job socket notification error:", error);
    return NextResponse.json({ success: false, message: "Unable to notify admins about job completion." }, { status: 500 });
  }
}
