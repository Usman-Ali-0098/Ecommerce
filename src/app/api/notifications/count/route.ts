import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/user-auth";
import { getUnreadNotificationCount } from "@/lib/services/notification.service";

export async function GET() {
  try {
    const user = await getUserSession();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User authentication required." },
        { status: 401 },
      );
    }

    const unreadCount = await getUnreadNotificationCount(user.id);

    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Notification count GET error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load notification count." },
      { status: 500 },
    );
  }
}
