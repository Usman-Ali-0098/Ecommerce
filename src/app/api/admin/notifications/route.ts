import {
  NextResponse,
} from "next/server";

import {
  getAdminSession,
} from "@/lib/admin-auth";

import {
  prisma,
} from "@/lib/prisma";

export async function GET() {
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

    const [
      notifications,
      unreadCount,
    ] =
      await Promise.all([
        prisma.adminNotification.findMany({
          orderBy: {
            createdAt:
              "desc",
          },

          take: 10,

          select: {
            id: true,
            orderId: true,
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

    return NextResponse.json({
      success: true,

      data: {
        notifications,
        unreadCount,
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

    const body =
      await request.json();

    const notificationId =
      typeof body?.notificationId ===
      "string"
        ? body.notificationId
        : "";

    const markAll =
      body?.markAll === true;

    if (markAll) {
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

    if (!notificationId) {
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