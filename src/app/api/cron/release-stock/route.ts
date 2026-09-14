import { NextResponse } from "next/server";

import { releaseExpiredStockReservations } from "@/lib/services/payment.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ success: false, message: "CRON_SECRET is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: await releaseExpiredStockReservations() });
}
