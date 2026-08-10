import AdminOrderFilters from "@/components/admin/orders/admin-order-filters";
import AdminOrdersPagination from "@/components/admin/orders/admin-orders-pagination";
import AdminOrdersTable from "@/components/admin/orders/admin-orders-table";

import {
  getAdminOrders,
} from "@/lib/services/admin-order.service";

type PageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
};

export default async function AdminOrdersPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const search =
    params.search?.trim() ??
    "";

  const status =
    params.status?.trim() ??
    "";

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

  const result =
    await getAdminOrders({
      search,
      status,
      page,
      pageSize: 20,
    });

  return (
    <section className="space-y-4">
      {/* Page Header */}

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Orders
        </h1>

        <p className="mt-0.5 text-xs text-gray-500">
          View and manage customer
          orders.
        </p>
      </div>

      {/* Summary Cards */}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <OrderSummaryCard
          label="Total Orders"
          value={result.summary.totalOrders.toLocaleString(
            "en-PK"
          )}
          icon={
            <OrdersSummaryIcon />
          }
        />

        <OrderSummaryCard
          label="Total Units"
          value={result.summary.totalUnits.toLocaleString(
            "en-PK"
          )}
          icon={
            <UnitsSummaryIcon />
          }
        />

        <OrderSummaryCard
          label="Total Amount"
          value={`Rs. ${result.summary.totalAmount.toLocaleString(
            "en-PK"
          )}`}
          icon={
            <AmountSummaryIcon />
          }
        />
      </div>

      {/* Filters */}

      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm shadow-gray-100/50">
        <AdminOrderFilters
          initialSearch={
            search
          }
          initialStatus={
            status
          }
        />
      </div>

      {/* Orders Table */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm shadow-gray-100/50">
        <AdminOrdersTable
          orders={
            result.orders
          }
        />

        {result.orders.length >
        0 ? (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-700">
                {
                  result.orders
                    .length
                }
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-700">
                {
                  result
                    .pagination
                    .total
                }
              </span>{" "}
              order
              {result.pagination
                .total === 1
                ? ""
                : "s"}
            </p>

            <AdminOrdersPagination
              page={
                result
                  .pagination
                  .page
              }
              totalPages={
                result
                  .pagination
                  .totalPages
              }
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

type OrderSummaryCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
};

function OrderSummaryCard({
  label,
  value,
  icon,
}: OrderSummaryCardProps) {
  return (
    <div className="flex min-h-[88px] items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm shadow-gray-100/50">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-500">
          {label}
        </p>

        <p className="mt-1 truncate text-lg font-semibold tracking-tight text-gray-900">
          {value}
        </p>
      </div>

      <div className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>
    </div>
  );
}

function OrdersSummaryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="4"
        width="14"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M8 8H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <path
        d="M8 12H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <path
        d="M8 16H13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UnitsSummaryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M4 7L8 5L12 7L8 9L4 7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      <path
        d="M12 7L16 5L20 7L16 9L12 7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      <path
        d="M4 13L8 11L12 13L8 15L4 13Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      <path
        d="M12 13L16 11L20 13L16 15L12 13Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      <path
        d="M8 15V19L12 21L16 19V15"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AmountSummaryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M14.5 9.5C14.1 8.7 13.2 8.2 12 8.2C10.6 8.2 9.6 8.9 9.6 10C9.6 11 10.3 11.5 12 12C13.8 12.5 14.6 13 14.6 14.2C14.6 15.4 13.5 16.1 12 16.1C10.6 16.1 9.6 15.5 9.2 14.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      <path
        d="M12 6.8V17.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}