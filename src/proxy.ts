import { NextResponse } from "next/server";

import { auth } from "@/auth";

const CUSTOMER_PAGE_PREFIXES = ["/cart", "/orders"];
const CUSTOMER_API_PREFIXES = [
  "/api/cart",
  "/api/orders",
  "/api/notifications",
];

function matchesPath(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;
  const role = session?.user?.role;

  const isAdminPage =
    pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi =
    pathname === "/api/admin" || pathname.startsWith("/api/admin/");
  const isCustomerPage = matchesPath(pathname, CUSTOMER_PAGE_PREFIXES);
  const isCustomerApi = matchesPath(pathname, CUSTOMER_API_PREFIXES);
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  // The public header uses this endpoint to show zero for signed-out visitors.
  if (pathname === "/api/cart/count" && !session?.user?.id) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    if (role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 },
      );
    }

    return NextResponse.next();
  }

  if (isCustomerApi) {
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    if (role !== "USER") {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 },
      );
    }

    return NextResponse.next();
  }

  if (isAdminPage) {
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (isCustomerPage) {
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (role !== "USER") {
      return NextResponse.redirect(new URL("/admin/products", request.url));
    }

    return NextResponse.next();
  }

  if (pathname === "/" && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin/products", request.url));
  }

  if (isAuthPage && session?.user?.id) {
    const destination = role === "ADMIN" ? "/admin/products" : "/";

    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/admin/:path*",
    "/cart/:path*",
    "/orders/:path*",
    "/api/admin/:path*",
    "/api/cart/:path*",
    "/api/orders/:path*",
    "/api/notifications/:path*",
  ],
};
