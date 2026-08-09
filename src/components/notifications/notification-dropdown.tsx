"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { notifyNotificationUpdated } from "@/lib/notification-events";

type NotificationItem = {
  id: string;
  type:
    | "ORDER_PLACED"
    | "ORDER_PROCESSING"
    | "ORDER_SHIPPED"
    | "ORDER_DELIVERED"
    | "ORDER_CANCELLED";
  title: string;
  message: string;
  orderId: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationDropdownProps = {
  open: boolean;
  onClose: () => void;
  onUnreadCountChange: (
    count: number
  ) => void;
};

export default function NotificationDropdown({
  open,
  onClose,
  onUnreadCountChange,
}: NotificationDropdownProps) {
  const router = useRouter();

  const [
    notifications,
    setNotifications,
  ] = useState<NotificationItem[]>([]);

  const [
    nextCursor,
    setNextCursor,
  ] = useState<string | null>(null);

  const [hasMore, setHasMore] =
    useState(false);

  const [
    isInitialLoading,
    setIsInitialLoading,
  ] = useState(false);

  const [
    isLoadingMore,
    setIsLoadingMore,
  ] = useState(false);

  const [
    isMarkingAll,
    setIsMarkingAll,
  ] = useState(false);

  const observerRef =
    useRef<IntersectionObserver | null>(
      null
    );

  const loadInitialNotifications =
    useCallback(async () => {
      try {
        setIsInitialLoading(true);

        const response = await fetch(
          "/api/notifications?limit=10",
          {
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          return;
        }

        setNotifications(
          result.data.notifications
        );

        setNextCursor(
          result.data.nextCursor
        );

        setHasMore(
          result.data.hasMore
        );

        onUnreadCountChange(
          result.data.unreadCount
        );
      } catch (error) {
        console.error(
          "Load notifications error:",
          error
        );
      } finally {
        setIsInitialLoading(false);
      }
    }, [onUnreadCountChange]);

  const loadMore =
    useCallback(async () => {
      if (
        !nextCursor ||
        !hasMore ||
        isLoadingMore
      ) {
        return;
      }

      try {
        setIsLoadingMore(true);

        const response = await fetch(
          `/api/notifications?cursor=${encodeURIComponent(
            nextCursor
          )}&limit=10`,
          {
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          return;
        }

        setNotifications(
          (current) => {
            const existingIds =
              new Set(
                current.map(
                  (item) =>
                    item.id
                )
              );

            const newItems =
              result.data.notifications.filter(
                (
                  item: NotificationItem
                ) =>
                  !existingIds.has(
                    item.id
                  )
              );

            return [
              ...current,
              ...newItems,
            ];
          }
        );

        setNextCursor(
          result.data.nextCursor
        );

        setHasMore(
          result.data.hasMore
        );

        onUnreadCountChange(
          result.data.unreadCount
        );
      } catch (error) {
        console.error(
          "Load more notifications error:",
          error
        );
      } finally {
        setIsLoadingMore(false);
      }
    }, [
      nextCursor,
      hasMore,
      isLoadingMore,
      onUnreadCountChange,
    ]);

  useEffect(() => {
    if (open) {
      loadInitialNotifications();
    }
  }, [
    open,
    loadInitialNotifications,
  ]);

  const bottomRef =
    useCallback(
      (
        node: HTMLDivElement | null
      ) => {
        if (
          isInitialLoading ||
          isLoadingMore
        ) {
          return;
        }

        if (
          observerRef.current
        ) {
          observerRef.current.disconnect();
        }

        observerRef.current =
          new IntersectionObserver(
            (entries) => {
              if (
                entries[0]
                  ?.isIntersecting &&
                hasMore
              ) {
                loadMore();
              }
            },
            {
              rootMargin:
                "80px",
            }
          );

        if (node) {
          observerRef.current.observe(
            node
          );
        }
      },
      [
        hasMore,
        isInitialLoading,
        isLoadingMore,
        loadMore,
      ]
    );

  async function markOneRead(
    notification:
      NotificationItem
  ) {
    if (!notification.isRead) {
      try {
        const response =
          await fetch(
            "/api/notifications",
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  action:
                    "markOneRead",

                  notificationId:
                    notification.id,
                }
              ),
            }
          );

        const result =
          await response.json();

        if (response.ok) {
          setNotifications(
            (current) =>
              current.map(
                (item) =>
                  item.id ===
                  notification.id
                    ? {
                        ...item,
                        isRead:
                          true,
                      }
                    : item
              )
          );

          onUnreadCountChange(
            result.data.unreadCount
          );
           notifyNotificationUpdated();
        }
      } catch (error) {
        console.error(
          "Mark notification read error:",
          error
        );
      }
    }

    onClose();

    if (
      notification.orderId
    ) {
      router.push(
        `/orders/${notification.orderId}`
      );
    }
  }

  async function markAllRead() {
    try {
      setIsMarkingAll(true);

      const response =
        await fetch(
          "/api/notifications",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              {
                action:
                  "markAllRead",
              }
            ),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        return;
      }

      setNotifications(
        (current) =>
          current.map(
            (item) => ({
              ...item,
              isRead: true,
            })
          )
      );

      onUnreadCountChange(
        result.data.unreadCount
      );
       notifyNotificationUpdated();
    } catch (error) {
      console.error(
        "Mark all notifications read error:",
        error
      );
    } finally {
      setIsMarkingAll(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Notifications
          </h3>

          <p className="mt-0.5 text-xs text-gray-400">
            Your recent updates
          </p>
        </div>

        <button
          type="button"
          onClick={markAllRead}
          disabled={
            isMarkingAll
          }
          className="text-xs font-medium text-[#087ff5] transition hover:text-[#066ed6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isMarkingAll
            ? "Updating..."
            : "Mark all as read"}
        </button>
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        {isInitialLoading ? (
          <NotificationLoading />
        ) : notifications.length ===
          0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <BellIcon />
            </div>

            <p className="text-sm font-medium text-gray-700">
              No notifications yet
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Order updates will
              appear here.
            </p>
          </div>
        ) : (
          <>
            {notifications.map(
              (notification) => (
                <button
                  key={
                    notification.id
                  }
                  type="button"
                  onClick={() =>
                    markOneRead(
                      notification
                    )
                  }
                  className={`flex w-full gap-3 border-b border-gray-100 px-4 py-4 text-left transition hover:bg-gray-50 ${
                    !notification.isRead
                      ? "bg-blue-50/60"
                      : "bg-white"
                  }`}
                >
                  <NotificationIcon
                    type={
                      notification.type
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {
                          notification.title
                        }
                      </p>

                      {!notification.isRead ? (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#087ff5]"
                          aria-label="Unread"
                        />
                      ) : null}
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                      {
                        notification.message
                      }
                    </p>

                    <p className="mt-2 text-[11px] text-gray-400">
                      {formatRelativeTime(
                        notification.createdAt
                      )}
                    </p>
                  </div>

                  {notification.orderId ? (
                    <span className="mt-1 shrink-0 text-gray-400">
                      →
                    </span>
                  ) : null}
                </button>
              )
            )}

            <div
              ref={bottomRef}
              className="min-h-1"
            />

            {isLoadingMore ? (
              <div className="px-4 py-4 text-center text-xs text-gray-400">
                Loading older
                notifications...
              </div>
            ) : null}

            {!hasMore &&
            notifications.length >
              0 ? (
              <div className="px-4 py-4 text-center text-xs text-gray-400">
                You&apos;ve reached
                the end.
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function NotificationIcon({
  type,
}: {
  type: NotificationItem["type"];
}) {
  const symbol =
    type ===
      "ORDER_DELIVERED"
      ? "✓"
      : type ===
          "ORDER_CANCELLED"
        ? "×"
        : type ===
            "ORDER_SHIPPED"
          ? "↗"
          : type ===
              "ORDER_PROCESSING"
            ? "…"
            : "✓";

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-[#087ff5]">
      {symbol}
    </div>
  );
}

function NotificationLoading() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({
        length: 5,
      }).map((_, index) => (
        <div
          key={index}
          className="flex gap-3 px-2 py-3"
        >
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />

          <div className="flex-1">
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />

            <div className="mt-2 h-3 w-full animate-pulse rounded bg-gray-100" />

            <div className="mt-2 h-2 w-1/3 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function formatRelativeTime(
  value: string
) {
  const createdAt =
    new Date(value);

  const now = new Date();

  const diffMs =
    now.getTime() -
    createdAt.getTime();

  const seconds =
    Math.floor(
      diffMs / 1000
    );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 7) {
    return `${days} day${
      days > 1 ? "s" : ""
    } ago`;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(createdAt);
}