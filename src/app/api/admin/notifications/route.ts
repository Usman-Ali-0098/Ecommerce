import {
  NextResponse,
} from "next/server";

import {
  getAdminSession,
} from "@/lib/admin-auth";

import {
  prisma,
} from "@/lib/prisma";
import { validateRequest } from "@/lib/validate-request";
import { adminNotificationActionSchema } from "@/lib/validations/admin";

export async function GET(request: Request) {
  try {
    const admin =
      await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const url = new URL(request.url);

    const cursor = url.searchParams.get("cursor");

    const parsedLimit = Number(url.searchParams.get("limit"));

    const limit =
      Number.isInteger(parsedLimit) && parsedLimit > 0 && parsedLimit <= 50
        ? parsedLimit
        : 10;

    const [
      notificationsPage,
      unreadCount,
    ] =
      await Promise.all([
        prisma.adminNotification.findMany({
          orderBy: {
            createdAt:
              "desc",
          },

          take: limit + 1,

          ...(cursor
            ? {
                cursor: { id: cursor },
                skip: 1,
              }
            : {}),

          select: {
            id: true,
            orderId: true,
            jobRunId: true,
            type: true,
            title: true,
            message: true,
            isRead: true,
            createdAt: true,
          },
        }),

        prisma.adminNotification.count({
          where: {
            isRead: false,
          },
        }),
      ]);

    const hasMore = notificationsPage.length > limit;

    const notifications = hasMore
      ? notificationsPage.slice(0, limit)
      : notificationsPage;

    const nextCursor = hasMore
      ? notifications[notifications.length - 1].id
      : null;

    return NextResponse.json({
      success: true,

      data: {
        notifications,
        unreadCount,
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    console.error(
      "Admin notifications GET error:",
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
    const admin =
      await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const validation = validateRequest(
      adminNotificationActionSchema,
      await request.json(),
    );

    if (!validation.success) {
      return validation.response;
    }

    if (validation.data.markAll === true) {
      await prisma.adminNotification.updateMany({
        where: {
          isRead: false,
        },

        data: {
          isRead: true,
        },
      });

      return NextResponse.json({
        success: true,
        message:
          "All notifications marked as read.",
      });
    }

    const { notificationId } = validation.data;

    await prisma.adminNotification.update({
      where: {
        id: notificationId,
      },

      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Notification marked as read.",
    });
  } catch (error) {
    console.error(
      "Admin notifications PATCH error:",
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
