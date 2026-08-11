import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  auth,
} from "@/auth";

import SiteHeader from "@/components/layout/site-header";
import OrdersPagination from "@/components/orders/orders-pagination";
import OrdersTable from "@/components/orders/orders-table";

import {
  getUserOrders,
} from "@/lib/services/order.service";

type OrdersPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export default async function OrdersPage({
  searchParams,
}: OrdersPageProps) {
  const session =
    await auth();

  if (
    !session?.user?.id
  ) {
    redirect("/login");
  }

  const userId =
    Number(
      session.user.id
    );

  if (
    !Number.isInteger(
      userId
    )
  ) {
    redirect("/login");
  }

  const params =
    await searchParams;

  const parsedPage =
    Number(
      params.page
    );

  const page =
    Number.isInteger(
      parsedPage
    ) &&
    parsedPage > 0
      ? parsedPage
      : 1;

  const {
    orders,
    pagination,
  } =
    await getUserOrders({
      userId,
      page,
      pageSize: 20,
    });

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-[#f7f9fb] px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[1400px]">
          {/* Heading */}

          <div className="mb-5 flex items-center gap-2.5">
            <Link
              href="/"
              aria-label="Back to products"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#087ff5] transition hover:bg-blue-50"
            >
              <span className="text-lg">
                ←
              </span>
            </Link>

            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
                My Orders
              </h1>

              <p className="mt-0.5 text-xs text-gray-500">
                View your previous and current orders.
              </p>
            </div>
          </div>

          {orders.length ===
          0 ? (
            <div className="rounded-lg border border-gray-200 bg-white px-6 py-14 text-center">
              <p className="text-sm font-semibold text-gray-800">
                No orders found
              </p>

              <p className="mt-1.5 text-xs text-gray-500">
                Your placed orders will appear here.
              </p>
            </div>
          ) : (
            <>
              <OrdersTable
                orders={
                  orders
                }
              />

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    {
                      pagination.total
                    }
                  </span>{" "}
                  total order
                  {pagination.total ===
                  1
                    ? ""
                    : "s"}
                </p>

                <OrdersPagination
                  page={
                    pagination.page
                  }
                  totalPages={
                    pagination.totalPages
                  }
                />
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}