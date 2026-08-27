import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUserSession } from "@/lib/user-auth";

import {
  getUnreadNotificationCount,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/services/notification.service";
import { validateRequest } from "@/lib/validate-request";
import {
  notificationActionSchema,
  notificationListQuerySchema,
} from "@/lib/validations/notification";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in to view notifications.",
        },
        {
          status: 401,
        },
      );
    }

    if (session.user.role !== "USER") {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 },
      );
    }

    const user = await getUserSession();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user session.",
        },
        {
          status: 401,
        },
      );
    }

    const userId = user.id;

    const url = new URL(request.url);
    const validation = validateRequest(
      notificationListQuerySchema,
      Object.fromEntries(url.searchParams),
    );

    if (!validation.success) {
      return validation.response;
    }

    const { cursor, limit } = validation.data;

    /*
     * Run both queries together:
     *
     * 1. notifications
     * 2. current unread counter
     */
    const [notificationResult, unreadCount] = await Promise.all([
      getUserNotifications({
        userId,
        cursor,
        limit,
      }),

      getUnreadNotificationCount(userId),
    ]);

    return NextResponse.json({
      success: true,

      data: {
        notifications: notificationResult.notifications,

        nextCursor: notificationResult.nextCursor,

        hasMore: notificationResult.hasMore,

        unreadCount,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load notifications.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        {
          status: 401,
        },
      );
    }

    if (session.user.role !== "USER") {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 },
      );
    }

    const user = await getUserSession();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user session.",
        },
        {
          status: 401,
        },
      );
    }

    const userId = user.id;

    const body = await request.json();
    const validation = validateRequest(notificationActionSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { action } = validation.data;

    /*
     * MARK ONE NOTIFICATION READ
     */
    if (action === "markOneRead") {
      const { notificationId } = validation.data;

      const notification = await markNotificationAsRead(userId, notificationId);

      /*
       * findFirst in service verifies
       * that this notification belongs
       * to the logged-in user.
       */
      if (!notification) {
        return NextResponse.json(
          {
            success: false,
            message: "Notification not found.",
          },
          {
            status: 404,
          },
        );
      }

      const unreadCount = await getUnreadNotificationCount(userId);

      return NextResponse.json({
        success: true,

        message: "Notification marked as read.",

        data: {
          notificationId: notification.id,

          unreadCount,
        },
      });
    }

    /*
     * MARK ALL NOTIFICATIONS READ
     */
    if (action === "markAllRead") {
      const result = await markAllNotificationsAsRead(userId);

      return NextResponse.json({
        success: true,

        message: "All notifications marked as read.",

        data: {
          updatedCount: result.count,

          unreadCount: 0,
        },
      });
    }

    throw new Error("Unsupported validated notification action.");
  } catch (error) {
    console.error("Update notification error:", error);

    return NextResponse.json(
      {
        success: false,

        message: "Unable to update notification.",
      },
      {
        status: 500,
      },
    );
  }
}
