"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bell,
  CheckCheck,
  ChevronDown,
  LogOut,
  ShoppingBag,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

type AdminHeaderProps = {
  admin: {
    fullName:
      | string
      | null;

    email: string;
  };
};

type AdminNotification = {
  id: string;

  orderId:
    | string
    | null;

  type:
    | "NEW_ORDER"
    | "ORDER_CANCELLED";

  title: string;

  message: string;

  isRead: boolean;

  createdAt: string;
};

export default function AdminHeader({
  admin,
}: AdminHeaderProps) {
  const router =
    useRouter();

  const [
    profileOpen,
    setProfileOpen,
  ] =
    useState(false);

  const [
    notificationOpen,
    setNotificationOpen,
  ] =
    useState(false);

  const [
    notifications,
    setNotifications,
  ] =
    useState<
      AdminNotification[]
    >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] =
    useState(0);

  const [
    isLoadingNotifications,
    setIsLoadingNotifications,
  ] =
    useState(false);

  const [
    isMarkingAll,
    setIsMarkingAll,
  ] =
    useState(false);

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] =
    useState(false);

  const profileRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const notificationRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const fullName =
    admin.fullName?.trim() ||
    "Admin";

  const initial =
    fullName
      .charAt(0)
      .toUpperCase() ||
    "A";

  const loadNotifications =
    useCallback(
      async (
        showLoading =
          false
      ) => {
        try {
          if (
            showLoading
          ) {
            setIsLoadingNotifications(
              true
            );
          }

          const response =
            await fetch(
              "/api/admin/notifications",
              {
                method:
                  "GET",

                cache:
                  "no-store",
              }
            );

          if (
            !response.ok
          ) {
            return;
          }

          const result =
            await response.json();

          if (
            !result.success
          ) {
            return;
          }

          setNotifications(
            result.data
              .notifications
          );

          setUnreadCount(
            result.data
              .unreadCount
          );
        } catch (
          error
        ) {
          console.error(
            "Load admin notifications error:",
            error
          );
        } finally {
          if (
            showLoading
          ) {
            setIsLoadingNotifications(
              false
            );
          }
        }
      },
      []
    );

  /*
   * Initial load + polling.
   *
   * This allows the admin bell
   * to discover new orders
   * without manually refreshing.
   */
  useEffect(() => {
    void loadNotifications();

    const interval =
      window.setInterval(
        () => {
          void loadNotifications();
        },
        30000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    loadNotifications,
  ]);

  /*
   * Close dropdowns when
   * clicking outside.
   */
  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;

      if (
        profileRef.current &&
        !profileRef.current.contains(
          target
        )
      ) {
        setProfileOpen(
          false
        );
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          target
        )
      ) {
        setNotificationOpen(
          false
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  async function handleNotificationClick(
    notification:
      AdminNotification
  ) {
    /*
     * Optimistically update UI.
     */
    if (
      !notification.isRead
    ) {
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

      setUnreadCount(
        (current) =>
          Math.max(
            0,
            current - 1
          )
      );

      try {
        await fetch(
          "/api/admin/notifications",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                notificationId:
                  notification.id,
              }),
          }
        );
      } catch (
        error
      ) {
        console.error(
          "Mark notification read error:",
          error
        );
      }
    }

    setNotificationOpen(
      false
    );

    if (
      notification.orderId
    ) {
      router.push(
        `/admin/orders/${notification.orderId}`
      );
    }
  }

  async function handleMarkAllRead() {
    if (
      unreadCount === 0 ||
      isMarkingAll
    ) {
      return;
    }

    try {
      setIsMarkingAll(
        true
      );

      const response =
        await fetch(
          "/api/admin/notifications",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                markAll:
                  true,
              }),
          }
        );

      if (
        !response.ok
      ) {
        return;
      }

      setNotifications(
        (current) =>
          current.map(
            (item) => ({
              ...item,
              isRead:
                true,
            })
          )
      );

      setUnreadCount(
        0
      );
    } catch (
      error
    ) {
      console.error(
        "Mark all notifications read error:",
        error
      );
    } finally {
      setIsMarkingAll(
        false
      );
    }
  }

  async function handleLogout() {
    try {
      setIsLoggingOut(
        true
      );

      const response =
        await fetch(
          "/api/admin/logout",
          {
            method:
              "POST",
          }
        );

      if (
        !response.ok
      ) {
        return;
      }

      router.replace(
        "/login"
      );

      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Admin logout error:",
        error
      );
    } finally {
      setIsLoggingOut(
        false
      );
    }
  }

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-gray-200 bg-white">
      <div className="flex h-full items-center justify-between px-4 sm:px-5 lg:px-6">
        {/* Brand */}

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-sm">
            E
          </div>

          <div>
            <p className="text-sm font-semibold leading-none text-gray-900">
              E-commerce
            </p>

            <p className="mt-1 hidden text-[11px] leading-none text-gray-400 sm:block">
              Admin Panel
            </p>
          </div>
        </div>

        {/* Right Side */}

        <div className="flex items-center gap-1.5">
          {/* Notifications */}

          <div
            ref={
              notificationRef
            }
            className="relative"
          >
            <button
              type="button"
              onClick={() => {
                const nextOpen =
                  !notificationOpen;

                setNotificationOpen(
                  nextOpen
                );

                setProfileOpen(
                  false
                );

                if (
                  nextOpen
                ) {
                  void loadNotifications(
                    true
                  );
                }
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
              aria-label="Notifications"
              aria-expanded={
                notificationOpen
              }
            >
              <Bell
                size={
                  17
                }
              />

              {unreadCount >
              0 ? (
                <span className="absolute right-0.5 top-0.5 flex min-h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-none text-white">
                  {unreadCount >
                  99
                    ? "99+"
                    : unreadCount}
                </span>
              ) : null}
            </button>

            {notificationOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
                {/* Header */}

                <div className="flex items-center justify-between border-b border-gray-100 px-3.5 py-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">
                      Notifications
                    </p>

                    <p className="mt-0.5 text-[10px] text-gray-400">
                      {unreadCount >
                      0
                        ? `${unreadCount} unread`
                        : "You're all caught up"}
                    </p>
                  </div>

                  {unreadCount >
                  0 ? (
                    <button
                      type="button"
                      onClick={
                        handleMarkAllRead
                      }
                      disabled={
                        isMarkingAll
                      }
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
                    >
                      <CheckCheck
                        size={
                          13
                        }
                      />

                      {isMarkingAll
                        ? "Marking..."
                        : "Mark all read"}
                    </button>
                  ) : null}
                </div>

                {/* Notifications */}

                <div className="max-h-[360px] overflow-y-auto">
                  {isLoadingNotifications &&
                  notifications.length ===
                    0 ? (
                    <div className="px-4 py-10 text-center">
                      <p className="text-xs text-gray-400">
                        Loading
                        notifications...
                      </p>
                    </div>
                  ) : notifications.length ===
                    0 ? (
                    <div className="px-4 py-10 text-center">
                      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                        <Bell
                          size={
                            15
                          }
                          className="text-gray-400"
                        />
                      </div>

                      <p className="mt-2 text-xs font-medium text-gray-700">
                        No
                        notifications
                      </p>

                      <p className="mt-1 text-[10px] text-gray-400">
                        New orders
                        will appear
                        here.
                      </p>
                    </div>
                  ) : (
                    notifications.map(
                      (
                        notification
                      ) => (
                        <button
                          key={
                            notification.id
                          }
                          type="button"
                          onClick={() =>
                            handleNotificationClick(
                              notification
                            )
                          }
                          className={`flex w-full gap-3 border-b border-gray-100 px-3.5 py-3 text-left transition last:border-b-0 hover:bg-gray-50 ${
                            !notification.isRead
                              ? "bg-blue-50/40"
                              : "bg-white"
                          }`}
                        >
                          {/* Icon */}

                          <div
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              notification.type ===
                              "ORDER_CANCELLED"
                                ? "bg-red-50 text-red-600"
                                : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            <ShoppingBag
                              size={
                                14
                              }
                            />
                          </div>

                          {/* Content */}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-xs font-medium text-gray-800">
                                {
                                  notification.title
                                }
                              </p>

                              {!notification.isRead ? (
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                              ) : null}
                            </div>

                            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500">
                              {
                                notification.message
                              }
                            </p>

                            <p className="mt-1.5 text-[10px] text-gray-400">
                              {formatRelativeTime(
                                notification.createdAt
                              )}
                            </p>
                          </div>
                        </button>
                      )
                    )
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Divider */}

          <div className="mx-1 h-6 w-px bg-gray-200" />

          {/* Profile */}

          <div
            ref={
              profileRef
            }
            className="relative"
          >
            <button
              type="button"
              onClick={() => {
                setProfileOpen(
                  (
                    current
                  ) =>
                    !current
                );

                setNotificationOpen(
                  false
                );
              }}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-gray-50"
              aria-expanded={
                profileOpen
              }
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {
                  initial
                }
              </span>

              <div className="hidden max-w-[170px] text-left sm:block">
                <p className="truncate text-xs font-medium leading-4 text-gray-800">
                  {
                    fullName
                  }
                </p>

                <p className="truncate text-[11px] leading-4 text-gray-400">
                  {
                    admin.email
                  }
                </p>
              </div>

              <ChevronDown
                size={
                  14
                }
                className={`text-gray-400 transition-transform duration-200 ${
                  profileOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {profileOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
                {/* Mobile Profile */}

                <div className="border-b border-gray-100 px-3.5 py-3 sm:hidden">
                  <p className="truncate text-xs font-medium text-gray-800">
                    {
                      fullName
                    }
                  </p>

                  <p className="mt-1 truncate text-[11px] text-gray-400">
                    {
                      admin.email
                    }
                  </p>
                </div>

                {/* Logout */}

                <div className="p-1.5">
                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                    disabled={
                      isLoggingOut
                    }
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogOut
                      size={
                        14
                      }
                    />

                    {isLoggingOut
                      ? "Logging out..."
                      : "Logout"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function formatRelativeTime(
  value: string
) {
  const date =
    new Date(value);

  const difference =
    Date.now() -
    date.getTime();

  const seconds =
    Math.floor(
      difference /
        1000
    );

  if (
    seconds < 60
  ) {
    return "Just now";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (
    minutes < 60
  ) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (
    hours < 24
  ) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (
    days < 7
  ) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(
    "en-PK",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  );
}