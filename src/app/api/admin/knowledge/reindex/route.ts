import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { JobsServiceError, sendKnowledgeReindexJob } from "@/lib/jobs-client";

/** Starts a full RAG knowledge-base rebuild (every active product/category
 * plus the jobs service's hardcoded policy/FAQ entries) via the jobs
 * service's already-existing /jobs/knowledge/reindex endpoint -- this route
 * is just the admin-triggerable front door for it, same pattern as
 * /api/admin/products/import. Reindexing is always a full rebuild and
 * always safe to re-run (each write is an upsert keyed by source), so no
 * request body is needed. */
export async function POST() {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin authentication required." },
        { status: 401 },
      );
    }

    const { jobId, sourceCount } = await sendKnowledgeReindexJob({ requestedBy: admin.id });

    return NextResponse.json({ success: true, data: { jobId, sourceCount } }, { status: 202 });
  } catch (error) {
    if (error instanceof JobsServiceError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 502 });
    }

    console.error("Admin knowledge reindex error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to start knowledge base resync." },
      { status: 500 },
    );
  }
}
