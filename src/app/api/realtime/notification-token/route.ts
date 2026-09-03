import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createNotificationSocketToken } from "@/lib/notifications/socket-token";

export async function POST() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const role = session?.user?.role;

  if (
    !Number.isInteger(userId) ||
    (role !== "USER" && role !== "ADMIN")
  ) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({
    token: createNotificationSocketToken({ userId, role }),
  });
}
