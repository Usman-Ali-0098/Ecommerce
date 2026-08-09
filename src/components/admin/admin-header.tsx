"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type AdminHeaderProps = {
  admin: {
    fullName: string | null;
    email: string;
  };
};

export default function AdminHeader({
  admin,
}: AdminHeaderProps) {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement | null>(null);

  const fullName =
    admin.fullName?.trim() ||
    "Admin";

  const initial =
    fullName
      .charAt(0)
      .toUpperCase() || "A";

  async function handleLogout() {
    try {
      setIsLoggingOut(true);

      const response =
        await fetch(
          "/api/admin/logout",
          {
            method: "POST",
          }
        );

      if (!response.ok) {
        return;
      }

      router.replace(
        "/admin/login"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Admin logout error:",
        error
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#087ff5] text-sm font-bold text-white">
            E
          </div>

          <div>
            <p className="text-base font-semibold text-gray-900">
              E-commerce
            </p>

            <p className="hidden text-xs text-gray-400 sm:block">
              Admin Panel
            </p>
          </div>
        </div>

        <div
          ref={menuRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() =>
              setOpen(
                (current) =>
                  !current
              )
            }
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-gray-100"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#087ff5] text-sm font-semibold text-white">
              {initial}
            </span>

            <div className="hidden text-left sm:block">
              <p className="max-w-[160px] truncate text-sm font-medium text-gray-800">
                {fullName}
              </p>

              <p className="max-w-[160px] truncate text-xs text-gray-400">
                {admin.email}
              </p>
            </div>

            <ChevronDownIcon />
          </button>

          {open ? (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="border-b border-gray-100 px-4 py-3 sm:hidden">
                <p className="truncate text-sm font-medium text-gray-800">
                  {fullName}
                </p>

                <p className="mt-0.5 truncate text-xs text-gray-400">
                  {admin.email}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                disabled={
                  isLoggingOut
                }
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogoutIcon />

                {isLoggingOut
                  ? "Logging out..."
                  : "Logout"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
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