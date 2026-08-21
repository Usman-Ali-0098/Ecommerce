"use client";

import Link from "next/link";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";

import {
  Bell,
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";

import { signOut, useSession } from "next-auth/react";

import { usePathname } from "next/navigation";

import NotificationDropdown from "@/components/notifications/notification-dropdown";

import { CART_UPDATED_EVENT } from "@/lib/cart-events";

import { NOTIFICATION_UPDATED_EVENT } from "@/lib/notification-events";

const navigation = [
  {
    label: "Home",
    href: "/",
  },
];

// FETCH CART COUNT

async function fetchCartCount() {
  const response = await fetch("/api/cart/count", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Unable to load cart count. Status: ${response.status}`);
  }

  const result = await response.json();

  return Number(result.count) || 0;
}

// FETCH NOTIFICATION COUNT

async function fetchNotificationCount() {
  const response = await fetch("/api/notifications?limit=1", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Unable to load notification count. Status: ${response.status}`,
    );
  }

  const result = await response.json();

  return Number(result.data?.unreadCount) || 0;
}

export default function SiteHeader() {
  const { data: session, status } = useSession();

  const pathname = usePathname();

  // DROPDOWN STATE

  const [accountOpen, setAccountOpen] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);

  // COUNTER STATE

  const [cartCount, setCartCount] = useState(0);

  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // REFS

  const accountRef = useRef<HTMLDivElement | null>(null);

  const notificationRef = useRef<HTMLDivElement | null>(null);

  /*
   * --------------------------------
   * INITIAL COUNTER LOAD
   * --------------------------------
   *
   * Fetch external data when the
   * customer becomes authenticated.
   *
   * The fetch functions themselves
   * do not call setState.
   *
   * State updates happen after the
   * async operation resolves.
   */

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    Promise.all([fetchCartCount(), fetchNotificationCount()])
      .then(([nextCartCount, nextNotificationCount]) => {
        if (cancelled) {
          return;
        }

        setCartCount(nextCartCount);

        setUnreadNotificationCount(nextNotificationCount);
      })
      .catch((error) => {
        console.error("Load header counters error:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  // CART UPDATED EVENT

  useEffect(() => {
    function handleCartUpdated() {
      if (status !== "authenticated") {
        return;
      }

      void fetchCartCount()
        .then((nextCartCount) => {
          setCartCount(nextCartCount);
        })
        .catch((error) => {
          console.error("Load cart count error:", error);
        });
    }

    window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    };
  }, [status]);

  // NOTIFICATION UPDATED EVENT

  useEffect(() => {
    function handleNotificationUpdated() {
      if (status !== "authenticated") {
        return;
      }

      void fetchNotificationCount()
        .then((nextNotificationCount) => {
          setUnreadNotificationCount(nextNotificationCount);
        })
        .catch((error) => {
          console.error("Load notification count error:", error);
        });
    }

    window.addEventListener(
      NOTIFICATION_UPDATED_EVENT,
      handleNotificationUpdated,
    );

    return () => {
      window.removeEventListener(
        NOTIFICATION_UPDATED_EVENT,
        handleNotificationUpdated,
      );
    };
  }, [status]);

  /*
   * --------------------------------
   * OUTSIDE CLICK
   * --------------------------------
   *
   * State changes here are triggered
   * by an external DOM event, so they
   * are appropriate inside the event
   * callback.
   */

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  /*
   * --------------------------------
   * USER DISPLAY DATA
   * --------------------------------
   *
   * Our custom NextAuth Session
   * exposes fullName.
   */

  const fullName = session?.user?.fullName || "User";

  const initial = fullName.trim().charAt(0).toUpperCase() || "U";

  /*
   * --------------------------------
   * ADMIN LOGIN
   * --------------------------------
   *
   * Customer session is cleared
   * before going to the shared login
   * page for admin authentication.
   */

  async function handleAdminLogin() {
    setAccountOpen(false);

    setNotificationsOpen(false);

    await signOut({
      redirect: false,
    });

    window.location.href = "/login";
  }

  /*
   * --------------------------------
   * CUSTOMER LOGOUT
   * --------------------------------
   */

  async function handleLogout() {
    setAccountOpen(false);

    setNotificationsOpen(false);

    await signOut({
      callbackUrl: "/",
    });
  }

  /*
   * --------------------------------
   * UI
   * --------------------------------
   */

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      {/* Main Header */}

      <div className="mx-auto flex h-14 w-full max-w-350 items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}

        <Link href="/" className="flex shrink-0 items-center gap-2">
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

          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-none tracking-tight text-gray-900">
              BudgetVibe
            </p>

            <p className="mt-1 text-[10px] leading-none text-gray-400">
              Thrift Store
            </p>
          </div>
        </Link>

        {/* Right Actions */}

        <div className="ml-auto flex items-center gap-1">
          {/* Notifications */}

          {status === "authenticated" ? (
            <div ref={notificationRef} className="relative">
              <button
                type="button"
                aria-label={`Notifications. ${unreadNotificationCount} unread`}
                onClick={() => {
                  setNotificationsOpen((current) => !current);

                  setAccountOpen(false);
                }}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
              >
                <Bell size={17} />

                {unreadNotificationCount > 0 ? (
                  <CountBadge count={unreadNotificationCount} />
                ) : null}
              </button>

              <NotificationDropdown
                open={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
                onUnreadCountChange={setUnreadNotificationCount}
              />
            </div>
          ) : null}

          {/* Cart */}

          <Link
            href="/cart"
            aria-label={
              status === "authenticated"
                ? `Shopping cart with ${cartCount} item(s)`
                : "Shopping cart"
            }
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
          >
            <ShoppingBag size={17} />

            {status === "authenticated" && cartCount > 0 ? (
              <CountBadge count={cartCount} />
            ) : null}
          </Link>

          {/* Session Loading */}

          {status === "loading" ? (
            <div className="ml-1 h-8 w-20 animate-pulse rounded-lg bg-gray-100" />
          ) : null}

          {/* Login */}

          {status === "unauthenticated" ? (
            <Link
              href="/login"
              className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-medium text-white transition hover:bg-blue-700"
            >
              <LogIn size={14} />

              <span className="hidden sm:inline">Login</span>
            </Link>
          ) : null}

          {/* Account */}

          {status === "authenticated" ? (
            <div ref={accountRef} className="relative ml-1">
              {/* Account Trigger */}

              <button
                type="button"
                onClick={() => {
                  setAccountOpen((current) => !current);

                  setNotificationsOpen(false);
                }}
                className="flex h-9 items-center gap-2 rounded-lg px-1.5 transition hover:bg-gray-50 sm:px-2"
                aria-expanded={accountOpen}
                aria-label="Open account menu"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
                  {initial}
                </span>

                <span className="hidden max-w-32.5 truncate text-xs font-medium text-gray-700 sm:block">
                  {fullName}
                </span>

                <ChevronDown
                  size={13}
                  className={`hidden text-gray-400 transition-transform sm:block ${
                    accountOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Account Dropdown */}

              {accountOpen ? (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
                  {/* User Info */}

                  <div className="border-b border-gray-100 px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
                        {initial}
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-800">
                          {fullName}
                        </p>

                        <p className="mt-0.5 truncate text-[10px] text-gray-400">
                          {session?.user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Links */}

                  <div className="p-1.5">
                    {/* My Orders */}

                    <Link
                      href="/orders"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                    >
                      <Package size={14} />
                      My Orders
                    </Link>

                    {/* Logout */}

                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Mobile Menu Trigger */}

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-50 md:hidden"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}

      {mobileOpen ? (
        <div className="border-t border-gray-100 bg-white px-4 py-3 md:hidden">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {status === "authenticated" ? (
              <Link
                href="/orders"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
              >
                <Package size={14} />
                My Orders
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

/*
 * --------------------------------
 * COUNT BADGE
 * --------------------------------
 */

function CountBadge({ count }: { count: number }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-none text-white ring-2 ring-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
