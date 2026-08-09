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

import { CART_UPDATED_EVENT } from "@/lib/cart-events";

import { NOTIFICATION_UPDATED_EVENT } from "@/lib/notification-events";

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
        status !== "authenticated"
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
        status !== "authenticated"
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

  /*
   * Load counters when
   * authentication state changes.
   */
  useEffect(() => {
    loadCartCount();
    loadNotificationCount();
  }, [
    loadCartCount,
    loadNotificationCount,
  ]);

  /*
   * Live cart counter.
   */
  useEffect(() => {
    function handleCartUpdated() {
      loadCartCount();
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

  /*
   * Live notification counter.
   *
   * Example:
   * New order creates notification
   * → event fires
   * → bell count reloads
   */
  useEffect(() => {
    function handleNotificationUpdated() {
      loadNotificationCount();
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
  }, [loadNotificationCount]);

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
        accountRef.current &&
        !accountRef.current.contains(
          target
        )
      ) {
        setAccountOpen(false);
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
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="text-xl font-semibold text-gray-900"
        >
          Ecommerce
        </Link>

        <div className="flex items-center gap-2">
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
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <BellIcon />

                {unreadNotificationCount >
                0 ? (
                  <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                    {unreadNotificationCount >
                    99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
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
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <CartIcon />

            {status ===
              "authenticated" &&
            cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                {cartCount > 99
                  ? "99+"
                  : cartCount}
              </span>
            ) : null}
          </Link>

          {status === "loading" ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-gray-100" />
          ) : null}

          {status ===
          "unauthenticated" ? (
            <Link
              href="/login"
              className="ml-1 rounded-md bg-[#087ff5] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#066ed6]"
            >
              Login
            </Link>
          ) : null}

          {/* Account */}
          {status ===
          "authenticated" ? (
            <div
              ref={accountRef}
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
                className="flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-gray-100"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#087ff5] text-sm font-semibold text-white">
                  {initial}
                </span>

                <span className="hidden max-w-[140px] truncate text-sm font-medium text-gray-700 sm:block">
                  {fullName}
                </span>

                <ChevronDownIcon />
              </button>

              {accountOpen ? (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <Link
                    href="/orders"
                    onClick={() =>
                      setAccountOpen(
                        false
                      )
                    }
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
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
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                  >
                    <LogoutIcon />

                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
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

function CartIcon() {
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

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-gray-400"
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
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
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
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    </svg>
  );
}