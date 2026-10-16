import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { cloudinary } from "@/lib/cloudinary";

const CSV_FOLDER = "ecommerce/bulk-import-csv";
const MAX_CSV_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Admin authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const filename = typeof body?.filename === "string" ? body.filename : "";
  const sizeBytes = Number(body?.sizeBytes);
  if (!filename.toLowerCase().endsWith(".csv") || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_CSV_BYTES) {
    return NextResponse.json({ success: false, message: "Choose a CSV file up to 50 MB." }, { status: 400 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ success: false, message: "Cloudinary configuration is missing." }, { status: 500 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${randomUUID()}.csv`;
  const signature = cloudinary.utils.api_sign_request(
    { folder: CSV_FOLDER, public_id: publicId, timestamp },
    apiSecret,
  );

  return NextResponse.json({
    success: true,
    cloudName,
    apiKey,
    timestamp,
    folder: CSV_FOLDER,
    publicId,
    resourceType: "raw",
    signature,
  });
}
