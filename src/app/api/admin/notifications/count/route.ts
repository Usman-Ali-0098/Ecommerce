import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const unreadCount = await prisma.adminNotification.count({
      where: {
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Admin notification count GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load notification count.",
      },
      { status: 500 },
    );
  }
}
