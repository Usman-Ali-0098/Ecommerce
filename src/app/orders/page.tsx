import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

import SiteHeader from "@/components/layout/site-header";
import OrdersPagination from "@/components/orders/orders-pagination";
import OrdersTable from "@/components/orders/orders-table";

import { getUserOrders } from "@/lib/services/order.service";

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

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = Number(
    session.user.id
  );

  if (!Number.isInteger(userId)) {
    redirect("/login");
  }

  const params =
    await searchParams;

  const parsedPage =
    Number(params.page);

  const page =
    Number.isInteger(parsedPage) &&
    parsedPage > 0
      ? parsedPage
      : 1;

  const {
    orders,
    pagination,
  } = await getUserOrders({
    userId,
    page,
    pageSize: 20,
  });

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-[#f7f9fb] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="mb-8 flex items-center gap-3">
            <Link
              href="/"
              aria-label="Back"
              className="text-lg text-[#087ff5]"
            >
              ←
            </Link>

            <h1 className="text-2xl font-medium text-[#087ff5]">
              My Orders
            </h1>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-white px-6 py-14 text-center">
              <p className="font-medium text-gray-800">
                No orders found
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Your placed orders will appear here.
              </p>
            </div>
          ) : (
            <>
              <OrdersTable
                orders={orders}
              />

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  {pagination.total} Total Count
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