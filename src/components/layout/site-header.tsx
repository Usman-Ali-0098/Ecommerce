"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  signOut,
  useSession,
} from "next-auth/react";

import NotificationDropdown from "@/components/notifications/notification-dropdown";

import {
  CART_UPDATED_EVENT,
} from "@/lib/cart-events";

import {
  NOTIFICATION_UPDATED_EVENT,
} from "@/lib/notification-events";

export default function SiteHeader() {
  const {
    data: session,
    status,
  } = useSession();

  const [
    accountOpen,
    setAccountOpen,
  ] = useState(false);

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false);

  const [
    cartCount,
    setCartCount,
  ] = useState(0);

  const [
    unreadNotificationCount,
    setUnreadNotificationCount,
  ] = useState(0);

  const accountRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const notificationRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const loadCartCount =
    useCallback(async () => {
      if (
        status !==
        "authenticated"
      ) {
        setCartCount(0);
        return;
      }

      try {
        const response =
          await fetch(
            "/api/cart/count",
            {
              cache:
                "no-store",
            }
          );

        if (!response.ok) {
          return;
        }

        const result =
          await response.json();

        setCartCount(
          Number(
            result.count
          ) || 0
        );
      } catch (error) {
        console.error(
          "Load cart count error:",
          error
        );
      }
    }, [status]);

  const loadNotificationCount =
    useCallback(async () => {
      if (
        status !==
        "authenticated"
      ) {
        setUnreadNotificationCount(
          0
        );

        return;
      }

      try {
        const response =
          await fetch(
            "/api/notifications?limit=1",
            {
              cache:
                "no-store",
            }
          );

        if (!response.ok) {
          console.error(
            "Notification count API failed:",
            response.status
          );

          return;
        }

        const result =
          await response.json();

        setUnreadNotificationCount(
          Number(
            result.data
              .unreadCount
          ) || 0
        );
      } catch (error) {
        console.error(
          "Load notification count error:",
          error
        );
      }
    }, [status]);

  useEffect(() => {
    void loadCartCount();
    void loadNotificationCount();
  }, [
    loadCartCount,
    loadNotificationCount,
  ]);

  useEffect(() => {
    function handleCartUpdated() {
      void loadCartCount();
    }

    window.addEventListener(
      CART_UPDATED_EVENT,
      handleCartUpdated
    );

    return () => {
      window.removeEventListener(
        CART_UPDATED_EVENT,
        handleCartUpdated
      );
    };
  }, [loadCartCount]);

  useEffect(() => {
    function handleNotificationUpdated() {
      void loadNotificationCount();
    }

    window.addEventListener(
      NOTIFICATION_UPDATED_EVENT,
      handleNotificationUpdated
    );

    return () => {
      window.removeEventListener(
        NOTIFICATION_UPDATED_EVENT,
        handleNotificationUpdated
      );
    };
  }, [
    loadNotificationCount,
  ]);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;

      if (
        accountRef.current &&
        !accountRef.current.contains(
          target
        )
      ) {
        setAccountOpen(
          false
        );
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          target
        )
      ) {
        setNotificationsOpen(
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

  const fullName =
    session?.user?.fullName ||
    session?.user?.name ||
    "User";

  const initial =
    fullName
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "U";

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}

        <Link
          href="/"
          className="flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm">
            E
          </div>

          <div>
            <p className="text-sm font-semibold leading-none tracking-tight text-gray-900">
              Ecommerce
            </p>

            <p className="mt-1 text-[10px] font-medium leading-none text-gray-400">
              Online Store
            </p>
          </div>
        </Link>

        {/* Right Side */}

        <div className="flex items-center gap-1">
          {/* Notifications */}

          {status ===
          "authenticated" ? (
            <div
              ref={
                notificationRef
              }
              className="relative"
            >
              <button
                type="button"
                aria-label={`Notifications. ${unreadNotificationCount} unread`}
                onClick={() => {
                  setNotificationsOpen(
                    (current) =>
                      !current
                  );

                  setAccountOpen(
                    false
                  );
                }}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
              >
                <BellIcon />

                {unreadNotificationCount >
                0 ? (
                  <CountBadge
                    count={
                      unreadNotificationCount
                    }
                  />
                ) : null}
              </button>

              <NotificationDropdown
                open={
                  notificationsOpen
                }
                onClose={() =>
                  setNotificationsOpen(
                    false
                  )
                }
                onUnreadCountChange={
                  setUnreadNotificationCount
                }
              />
            </div>
          ) : null}

          {/* Cart */}

          <Link
            href="/cart"
            aria-label={`Shopping cart with ${cartCount} item(s)`}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
          >
            <CartIcon />

            {status ===
              "authenticated" &&
            cartCount > 0 ? (
              <CountBadge
                count={
                  cartCount
                }
              />
            ) : null}
          </Link>

          {/* Session Loading */}

          {status ===
          "loading" ? (
            <div className="ml-1 h-8 w-20 animate-pulse rounded-lg bg-gray-100" />
          ) : null}

          {/* Login */}

          {status ===
          "unauthenticated" ? (
            <Link
              href="/login"
              className="ml-1 inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              Sign In
            </Link>
          ) : null}

          {/* Account */}

          {status ===
          "authenticated" ? (
            <div
              ref={
                accountRef
              }
              className="relative ml-1"
            >
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(
                    (current) =>
                      !current
                  );

                  setNotificationsOpen(
                    false
                  );
                }}
                className="flex h-9 items-center gap-2 rounded-lg px-1.5 transition hover:bg-gray-50 sm:px-2"
                aria-expanded={
                  accountOpen
                }
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
                  {initial}
                </span>

                <span className="hidden max-w-[130px] truncate text-xs font-medium text-gray-700 sm:block">
                  {fullName}
                </span>

                <ChevronDownIcon
                  open={
                    accountOpen
                  }
                />
              </button>

              {accountOpen ? (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/50">
                  {/* User Info */}

                  <div className="border-b border-gray-100 px-3.5 py-3">
                    <p className="truncate text-xs font-semibold text-gray-800">
                      {fullName}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] text-gray-400">
                      {
                        session?.user
                          ?.email
                      }
                    </p>
                  </div>

                  {/* Menu */}

                  <div className="p-1.5">
                    <Link
                      href="/orders"
                      onClick={() =>
                        setAccountOpen(
                          false
                        )
                      }
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                    >
                      <OrdersIcon />

                      My Orders
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        signOut({
                          callbackUrl:
                            "/",
                        })
                      }
                      className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <LogoutIcon />

                      Sign Out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function CountBadge({
  count,
}: {
  count: number;
}) {
  return (
    <span className="absolute -right-0.5 -top-0.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-none text-white ring-2 ring-white">
      {count > 99
        ? "99+"
        : count}
    </span>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[17px] w-[17px]"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />

      <path d="M10 21h4" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[17px] w-[17px]"
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="20"
        r="1"
      />

      <circle
        cx="19"
        cy="20"
        r="1"
      />

      <path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 2-1.6L21 7H6" />
    </svg>
  );
}

function ChevronDownIcon({
  open,
}: {
  open: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hidden h-3.5 w-3.5 text-gray-400 transition-transform duration-200 sm:block ${
        open
          ? "rotate-180"
          : ""
      }`}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M6 2h12v20H6z" />

      <path d="M9 7h6" />

      <path d="M9 11h6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M10 17l5-5-5-5" />

      <path d="M15 12H3" />

      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    </svg>
  );
}