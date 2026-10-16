import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/admin-auth";
import { JobsServiceError, sendBulkCsvImportJob } from "@/lib/jobs-client";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  secureUrl: z.string().url(),
  publicId: z.string().regex(/^(?:ecommerce\/bulk-import-csv\/)?[0-9a-f-]{36}\.csv$/i),
  version: z.union([z.string(), z.number()]).transform(String),
  filename: z.string().trim().min(1).max(255).refine((name) => name.toLowerCase().endsWith(".csv")),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
});

export async function POST(request: Request) {
  try {
    // need only one check in middle ware
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Admin authentication required." }, { status: 401 });
    }

    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Invalid uploaded CSV metadata." }, { status: 400 });
    }
    const { secureUrl, publicId, version, filename, sizeBytes } = parsed.data;
    const assetUrl = new URL(secureUrl);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (
      !cloudName ||
      assetUrl.protocol !== "https:" ||
      assetUrl.hostname !== "res.cloudinary.com" ||
      !assetUrl.pathname.startsWith(`/${cloudName}/raw/upload/`)
    ) {
      return NextResponse.json({ success: false, message: "CSV must be uploaded to Cloudinary." }, { status: 400 });
    }

    const event = await prisma.jobRun.create({
      data: {
        type: "PRODUCT_IMPORT",
        status: "QUEUED",
        requestedBy: admin.id,
        cloudinaryPublicId: publicId,
        cloudinarySecureUrl: secureUrl,
        cloudinaryVersion: version,
        originalFilename: filename,
        sizeBytes,
        idempotencyKey: publicId,
        phase: "QUEUED",
      },
      select: { id: true },
    });

    try {
      const queued = await sendBulkCsvImportJob({ jobRunId: event.id });
      return NextResponse.json(
        { success: true, data: { eventId: event.id, jobId: queued.jobId, taskId: queued.taskId, status: queued.status } },
        { status: 202 },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to enqueue CSV import.";
      await prisma.jobRun.update({
        where: { id: event.id },
        data: { status: "FAILED", phase: "ENQUEUE_FAILED", error: message, enqueueError: message, finishedAt: new Date() },
      });
      throw error;
    }
  } catch (error) {
    if (error instanceof JobsServiceError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 502 });
    }
    console.error("CSV bulk import initiation error:", error);
    return NextResponse.json({ success: false, message: "Unable to start CSV import." }, { status: 500 });
  }
}
