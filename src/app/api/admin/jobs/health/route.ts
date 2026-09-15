import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";

// Lets the bulk-import review screen check the jobs service is actually up
// BEFORE it starts uploading anything to Cloudinary — no point burning
// bandwidth/storage on images for products that can never be created.
export async function GET() {
  const admin = await getAdminSession();

  if (!admin) {
    return NextResponse.json({ success: false, message: "Admin authentication required." }, { status: 401 });
  }

  const base = process.env.FASTAPI_JOBS_URL;

  if (!base) {
    return NextResponse.json(
      { success: false, message: "FASTAPI_JOBS_URL is not configured." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(new URL("/health", base).toString(), {
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, message: "The import service isn't healthy." }, { status: 503 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "The import service is unreachable." },
      { status: 503 },
    );
  }
}
