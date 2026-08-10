"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white lg:block">
      <nav className="sticky top-14 space-y-1 p-3">
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