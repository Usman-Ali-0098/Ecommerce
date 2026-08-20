"use client";

import {
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

import {
  signOut,
} from "next-auth/react";

import Image from "next/image"

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

type AdminNotificationsResponse = {
  success: boolean;

  data: {
    notifications:
      AdminNotification[];

    unreadCount:
      number;
  };
};

/*
 * --------------------------------
 * FETCH ADMIN NOTIFICATIONS
 * --------------------------------
 *
 * This function only communicates
 * with the API and returns data.
 *
 * It does not update React state.
 */

async function fetchAdminNotifications() {
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

  if (!response.ok) {
    throw new Error(
      `Unable to load admin notifications. Status: ${response.status}`
    );
  }

  const result =
    (await response.json()) as
      AdminNotificationsResponse;

  if (!result.success) {
    throw new Error(
      "Unable to load admin notifications."
    );
  }

  return result.data;
}

export default function AdminHeader({
  admin,
}: AdminHeaderProps) {
  const router =
    useRouter();

  /*
   * --------------------------------
   * STATE
   * --------------------------------
   */

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

  /*
   * --------------------------------
   * REFS
   * --------------------------------
   */

  const profileRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const notificationRef =
    useRef<HTMLDivElement | null>(
      null
    );

  /*
   * --------------------------------
   * ADMIN DISPLAY
   * --------------------------------
   */

  const fullName =
    admin.fullName?.trim() ||
    "Admin";

  const initial =
    fullName
      .charAt(0)
      .toUpperCase() ||
    "A";

  /*
   * --------------------------------
   * MANUAL NOTIFICATION REFRESH
   * --------------------------------
   *
   * Used from user events such as
   * opening the notification dropdown.
   */

  async function loadNotifications(
    showLoading =
      false
  ) {
    try {
      if (
        showLoading
      ) {
        setIsLoadingNotifications(
          true
        );
      }

      const data =
        await fetchAdminNotifications();

      setNotifications(
        data.notifications
      );

      setUnreadCount(
        Number(
          data.unreadCount
        ) || 0
      );
    } catch (error) {
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
  }

  /*
   * --------------------------------
   * INITIAL LOAD + POLLING
   * --------------------------------
   *
   * Important:
   * We do not directly call a helper
   * which synchronously mutates state
   * from the effect.
   *
   * The API function returns data.
   * State changes happen only after
   * the asynchronous request resolves.
   */

  useEffect(() => {
    let cancelled =
      false;

    void fetchAdminNotifications()
      .then(
        (data) => {
          if (
            cancelled
          ) {
            return;
          }

          setNotifications(
            data.notifications
          );

          setUnreadCount(
            Number(
              data.unreadCount
            ) || 0
          );
        }
      )
      .catch(
        (error) => {
          if (
            cancelled
          ) {
            return;
          }

          console.error(
            "Initial admin notifications load error:",
            error
          );
        }
      );

    /*
     * Check periodically for
     * new orders/cancellations.
     */

    const interval =
      window.setInterval(
        () => {
          void fetchAdminNotifications()
            .then(
              (data) => {
                if (
                  cancelled
                ) {
                  return;
                }

                setNotifications(
                  data.notifications
                );

                setUnreadCount(
                  Number(
                    data.unreadCount
                  ) || 0
                );
              }
            )
            .catch(
              (error) => {
                if (
                  cancelled
                ) {
                  return;
                }

                console.error(
                  "Admin notification polling error:",
                  error
                );
              }
            );
        },
        30000
      );

    return () => {
      cancelled =
        true;

      window.clearInterval(
        interval
      );
    };
  }, []);

  /*
   * --------------------------------
   * OUTSIDE CLICK
   * --------------------------------
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

  /*
   * --------------------------------
   * SINGLE NOTIFICATION CLICK
   * --------------------------------
   */

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
                  notificationId:
                    notification.id,
                }),
            }
          );

        if (
          !response.ok
        ) {
          /*
           * If server update fails,
           * refresh server state.
           */

          void loadNotifications();
        }
      } catch (error) {
        console.error(
          "Mark notification read error:",
          error
        );

        void loadNotifications();
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

  /*
   * --------------------------------
   * MARK ALL READ
   * --------------------------------
   */

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
    } catch (error) {
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

  /*
   * --------------------------------
   * LOGOUT
   * --------------------------------
   */

  async function handleLogout() {
    if (
      isLoggingOut
    ) {
      return;
    }

    try {
      setIsLoggingOut(
        true
      );

      setProfileOpen(
        false
      );

      setNotificationOpen(
        false
      );

      await signOut({
        redirect: false,
      });

      router.replace(
        "/login"
      );

      router.refresh();
    } catch (error) {
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

  /*
   * --------------------------------
   * UI
   * --------------------------------
   */

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-gray-200 bg-white">
      <div className="flex h-full items-center justify-between px-4 sm:px-5 lg:px-6">
        {/* Brand */}

        <div className="flex items-center gap-2.5">
           <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
    <Image
      src="/products/budget-vibe.png"
      alt="Sasta-pak Logo"
      fill
      sizes="32px"
      className="object-contain"
      priority
    />
  </div>

          <div>
            <p className="text-sm font-semibold leading-none text-gray-900">
              BudgetVibe
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
            {/* Bell */}

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

                /*
                 * Refresh immediately when
                 * admin opens notifications.
                 */

                if (
                  nextOpen
                ) {
                  void loadNotifications(
                    true
                  );
                }
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
              aria-label={`Notifications. ${unreadCount} unread`}
              aria-expanded={
                notificationOpen
              }
            >
              <Bell
                size={
                  17
                }
              />

              {/* Unread Badge */}

              {unreadCount >
              0 ? (
                <span className="absolute right-0.5 top-0.5 flex min-h-3.75 min-w-3.75 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-none text-white">
                  {unreadCount >
                  99
                    ? "99+"
                    : unreadCount}
                </span>
              ) : null}
            </button>

            {/* Notification Dropdown */}

            {notificationOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-85 max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
                {/* Dropdown Header */}

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

                  {/* Mark All */}

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
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
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

                {/* Notification List */}

                <div className="max-h-90 overflow-y-auto">
                  {isLoadingNotifications &&
                  notifications.length ===
                    0 ? (
                    /* Loading */

                    <div className="px-4 py-10 text-center">
                      <p className="text-xs text-gray-400">
                        Loading
                        notifications...
                      </p>
                    </div>
                  ) : notifications.length ===
                    0 ? (
                    /* Empty */

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
                        No notifications
                      </p>

                      <p className="mt-1 text-[10px] text-gray-400">
                        New orders will
                        appear here.
                      </p>
                    </div>
                  ) : (
                    /* Notifications */

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
                            void handleNotificationClick(
                              notification
                            )
                          }
                          className={`flex w-full gap-3 border-b border-gray-100 px-3.5 py-3 text-left transition last:border-b-0 hover:bg-gray-50 ${
                            !notification.isRead
                              ? "bg-blue-50/40"
                              : "bg-white"
                          }`}
                        >
                          {/* Notification Icon */}

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

                          {/* Notification Content */}

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
            {/* Profile Trigger */}

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
              aria-label="Open admin profile menu"
              aria-expanded={
                profileOpen
              }
            >
              {/* Avatar */}

              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {
                  initial
                }
              </span>

              {/* Admin Details */}

              <div className="hidden max-w-42.5 text-left sm:block">
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

            {/* Profile Dropdown */}

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
                    onClick={() =>
                      void handleLogout()
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

/*
 * --------------------------------
 * RELATIVE TIME
 * --------------------------------
 */

function formatRelativeTime(
  value: string
) {
  const date =
    new Date(value);

  const difference =
    Date.now() -
    date.getTime();

  /*
   * Handle dates that may be
   * slightly ahead due to clocks.
   */

  const safeDifference =
    Math.max(
      0,
      difference
    );

  const seconds =
    Math.floor(
      safeDifference /
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
