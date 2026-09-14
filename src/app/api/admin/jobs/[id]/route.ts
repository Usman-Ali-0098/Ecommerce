import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

// Reads the JobRun/JobRunItem rows the jobs service (FastAPI/Celery) writes
// via raw SQL, straight from Postgres via Prisma — no round-trip through
// FastAPI needed for status polling.
export async function GET(_request: Request, { params }: RouteContext) {
  const admin = await getAdminSession();

  if (!admin) {
    return NextResponse.json({ success: false, message: "Admin authentication required." }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.jobRun.findUnique({
    where: { id },
    include: { items: { orderBy: { rowIndex: "asc" } } },
  });

  if (!job) {
    return NextResponse.json({ success: false, message: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: job.id,
      status: job.status,
      summary: job.summary,
      error: job.error,
      items: job.items.map((item) => ({
        id: item.id,
        rowIndex: item.rowIndex,
        status: item.status,
        message: item.message,
        productId: item.productId,
      })),
    },
  });
}
