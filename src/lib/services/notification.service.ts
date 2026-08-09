import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 10;

type CreateOrderNotificationParams = {
  userId: number;
  orderId: string;
  type:
    | "ORDER_PLACED"
    | "ORDER_PROCESSING"
    | "ORDER_SHIPPED"
    | "ORDER_DELIVERED"
    | "ORDER_CANCELLED";
  title: string;
  message: string;
};

export async function createOrderNotification({
  userId,
  orderId,
  type,
  title,
  message,
}: CreateOrderNotificationParams) {
  return prisma.notification.create({
    data: {
      userId,
      orderId,
      type,
      title,
      message,
    },
  });
}

type GetUserNotificationsParams = {
  userId: number;
  cursor?: string;
  limit?: number;
};

export async function getUserNotifications({
  userId,
  cursor,
  limit = DEFAULT_LIMIT,
}: GetUserNotificationsParams) {
  const safeLimit = Math.min(
    Math.max(limit, 1),
    50
  );

  const notifications =
    await prisma.notification.findMany({
      where: {
        userId,
      },

      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],

      take: safeLimit + 1,

      ...(cursor
        ? {
            cursor: {
              id: cursor,
            },
            skip: 1,
          }
        : {}),

      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        orderId: true,
        isRead: true,
        createdAt: true,
      },
    });

  const hasMore =
    notifications.length > safeLimit;

  const items = hasMore
    ? notifications.slice(0, safeLimit)
    : notifications;

  const nextCursor =
    hasMore && items.length > 0
      ? items[items.length - 1].id
      : null;

  return {
    notifications: items,
    nextCursor,
    hasMore,
  };
}

export async function getUnreadNotificationCount(
  userId: number
) {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

export async function markNotificationAsRead(
  userId: number,
  notificationId: string
) {
  const notification =
    await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      select: {
        id: true,
        isRead: true,
      },
    });

  if (!notification) {
    return null;
  }

  if (notification.isRead) {
    return notification;
  }

  return prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
    },
    select: {
      id: true,
      isRead: true,
    },
  });
}

export async function markAllNotificationsAsRead(
  userId: number
) {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}