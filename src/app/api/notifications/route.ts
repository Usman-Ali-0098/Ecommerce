import { NextResponse } from "next/server";

import { auth } from "@/auth";

import {
  getUnreadNotificationCount,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/services/notification.service";

const DEFAULT_LIMIT = 10;

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in to view notifications.",
        },
        {
          status: 401,
        }
      );
    }

    const userId = Number(
      session.user.id
    );

    if (!Number.isInteger(userId)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid user session.",
        },
        {
          status: 401,
        }
      );
    }

    const url = new URL(request.url);

    const cursor =
      url.searchParams.get("cursor") ??
      undefined;

    const rawLimit = Number(
      url.searchParams.get("limit")
    );

    const limit =
      Number.isInteger(rawLimit) &&
      rawLimit > 0
        ? Math.min(rawLimit, 50)
        : DEFAULT_LIMIT;

    /*
     * Run both queries together:
     *
     * 1. notifications
     * 2. current unread counter
     */
    const [
      notificationResult,
      unreadCount,
    ] = await Promise.all([
      getUserNotifications({
        userId,
        cursor,
        limit,
      }),

      getUnreadNotificationCount(
        userId
      ),
    ]);

    return NextResponse.json({
      success: true,

      data: {
        notifications:
          notificationResult.notifications,

        nextCursor:
          notificationResult.nextCursor,

        hasMore:
          notificationResult.hasMore,

        unreadCount,
      },
    });
  } catch (error) {
    console.error(
      "Get notifications error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load notifications.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    const userId = Number(
      session.user.id
    );

    if (!Number.isInteger(userId)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid user session.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const action =
      body?.action;

    /*
     * MARK ONE NOTIFICATION READ
     */
    if (
      action === "markOneRead"
    ) {
      const notificationId =
        body?.notificationId;

      if (
        typeof notificationId !==
          "string" ||
        notificationId.trim()
          .length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Notification ID is required.",
          },
          {
            status: 400,
          }
        );
      }

      const notification =
        await markNotificationAsRead(
          userId,
          notificationId
        );

      /*
       * findFirst in service verifies
       * that this notification belongs
       * to the logged-in user.
       */
      if (!notification) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Notification not found.",
          },
          {
            status: 404,
          }
        );
      }

      const unreadCount =
        await getUnreadNotificationCount(
          userId
        );

      return NextResponse.json({
        success: true,

        message:
          "Notification marked as read.",

        data: {
          notificationId:
            notification.id,

          unreadCount,
        },
      });
    }

    /*
     * MARK ALL NOTIFICATIONS READ
     */
    if (
      action === "markAllRead"
    ) {
      const result =
        await markAllNotificationsAsRead(
          userId
        );

      return NextResponse.json({
        success: true,

        message:
          "All notifications marked as read.",

        data: {
          updatedCount:
            result.count,

          unreadCount: 0,
        },
      });
    }

    /*
     * Unsupported action
     */
    return NextResponse.json(
      {
        success: false,

        message:
          "Invalid notification action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "Update notification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to update notification.",
      },
      {
        status: 500,
      }
    );
  }
}