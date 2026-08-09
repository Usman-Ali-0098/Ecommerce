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
    <aside className="hidden min-h-[calc(100vh-64px)] w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
      <nav className="space-y-2 p-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(
              `${item.href}/`
            );

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-blue-50 text-[#087ff5]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon />

              {item.label}
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
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M6 3h12l1 4H5l1-4Z" />
      <path d="M5 7v13h14V7" />
      <path d="M9 11h6" />
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
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 2h12v20H6z" />
      <path d="M9 7h6" />
      <path d="M9 11h6" />
      <path d="M9 15h4" />
    </svg>
  );
}