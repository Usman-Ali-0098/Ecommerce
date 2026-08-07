"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

export default function SiteHeader() {
  const { data: session, status } = useSession();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isLoggedIn =
    status === "authenticated" && Boolean(session?.user);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-semibold text-gray-900"
        >
          E-commerce
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/cart"
            aria-label="Shopping cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-md text-[#087ff5] transition-colors hover:bg-blue-50"
          >
            <CartIcon />

            {/*
              Later this will become the real cart count.
            */}
            <span className="absolute -right-1 -top-1 hidden min-w-5 rounded-full bg-red-500 px-1 text-center text-xs leading-5 text-white">
              0
            </span>
          </Link>

          <button
            type="button"
            aria-label="Notifications"
            className="flex h-10 w-10 items-center justify-center rounded-md text-[#087ff5] transition-colors hover:bg-blue-50"
          >
            <BellIcon />
          </button>

          {status === "loading" ? (
            <div className="h-10 w-24 animate-pulse rounded-md bg-gray-100" />
          ) : isLoggedIn ? (
            <div className="relative">
              <button
                type="button"
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
                onClick={() =>
                  setIsMenuOpen((current) => !current)
                }
                className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-700">
                  {getUserInitial(
                    session?.user?.fullName ??
                      session?.user?.email ??
                      "U"
                  )}
                </div>

                <div className="hidden text-left sm:block">
                  <p className="max-w-36 truncate text-sm font-medium text-gray-700">
                    {session?.user?.fullName ??
                      session?.user?.email}
                  </p>

                  {session?.user?.role ? (
                    <p className="text-xs capitalize text-gray-400">
                      {session.user.role.toLowerCase()}
                    </p>
                  ) : null}
                </div>

                <ChevronDownIcon open={isMenuOpen} />
              </button>

              {isMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
                >
                  <div className="border-b border-gray-100 px-4 py-3 sm:hidden">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {session?.user?.fullName ??
                        session?.user?.email}
                    </p>

                    {session?.user?.email ? (
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {session.user.email}
                      </p>
                    ) : null}
                  </div>

                  <Link
                    href="/orders"
                    role="menuitem"
                    onClick={() =>
                      setIsMenuOpen(false)
                    }
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <OrdersIcon />
                    My Orders
                  </Link>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      setIsMenuOpen(false);

                      await signOut({
                        callbackUrl: "/",
                      });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-500 transition-colors hover:bg-red-50"
                  >
                    <LogoutIcon />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-[#087ff5] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#066ed6]"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function getUserInitial(value: string) {
  return value.trim().charAt(0).toUpperCase();
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
      <path d="M6 7h12l-1 12H7L6 7Z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
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
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M10 21h4" />
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
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 text-gray-500 transition-transform ${
        open ? "rotate-180" : ""
      }`}
      aria-hidden="true"
    >
      <path d="m5 7 5 5 5-5" />
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
      className="h-5 w-5 text-[#087ff5]"
      aria-hidden="true"
    >
      <path d="M5 7 12 3l7 4-7 4-7-4Z" />
      <path d="M5 7v10l7 4 7-4V7" />
      <path d="M12 11v10" />
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
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M10 5H5v14h5" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </svg>
  );
}