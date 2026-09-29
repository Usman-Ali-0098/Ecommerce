"use client";

import { useEffect } from "react";

import { X } from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAdminSidebar } from "@/components/admin/admin-sidebar-context";

const navItems = [
  {
    label: "Products",
    href: "/admin/products",
    icon: ProductsIcon,
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: OrdersIcon,
  },
  {
    label: "Knowledge Base",
    href: "/admin/knowledge-base",
    icon: KnowledgeBaseIcon,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const { open, close } = useAdminSidebar();

  // Close the mobile/tablet drawer whenever the route changes.
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock background scroll while the mobile/tablet drawer is open.
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      {/* Backdrop (mobile / tablet only) */}

      {open ? (
        <div
          onClick={close}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-gray-900/40 lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed top-14 bottom-0 left-0 z-50 w-64 overflow-y-auto border-r border-gray-200 bg-white shadow-xl shadow-gray-900/10 transition-transform duration-200 ease-out lg:sticky lg:top-14 lg:z-0 lg:h-[calc(100vh-56px)] lg:w-56 lg:shrink-0 lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header (mobile / tablet only) */}

        <div className="flex items-center justify-between border-b border-gray-100 px-3.5 py-3 lg:hidden">
          <span className="text-xs font-semibold text-gray-500">Menu</span>

          <button
            type="button"
            onClick={close}
            aria-label="Close navigation menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(
                `${item.href}/`
              );

            const Icon =
              item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon />

                <span>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function ProductsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden="true"
    >
      <path
        d="M4 7.5L12 3L20 7.5L12 12L4 7.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      <path
        d="M4 7.5V16.5L12 21L20 16.5V7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      <path
        d="M12 12V21"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden="true"
    >
      <path
        d="M7 3.75H17C18.24 3.75 19.25 4.76 19.25 6V20L16.75 18.4L14.25 20L11.75 18.4L9.25 20L6.75 18.4L4.75 19.7V6C4.75 4.76 5.76 3.75 7 3.75Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      <path
        d="M8 8H16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      <path
        d="M8 12H16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function KnowledgeBaseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden="true"
    >
      <ellipse
        cx="12"
        cy="6"
        rx="7"
        ry="3"
        stroke="currentColor"
        strokeWidth="1.6"
      />

      <path
        d="M5 6V18C5 19.66 8.13 21 12 21C15.87 21 19 19.66 19 18V6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      <path
        d="M5 12C5 13.66 8.13 15 12 15C15.87 15 19 13.66 19 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
