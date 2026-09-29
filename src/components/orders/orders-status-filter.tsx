"use client";

import { useRouter, useSearchParams } from "next/navigation";

import FilterDropdown from "@/components/products/filter-dropdown";

const STATUS_OPTIONS = [
  { value: "", label: "All Orders" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "In Progress" },
  { value: "SHIPPED", label: "Dispatched" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

type OrdersStatusFilterProps = {
  initialStatus: string;
};

export default function OrdersStatusFilter({
  initialStatus,
}: OrdersStatusFilterProps) {
  const router = useRouter();

  const searchParams = useSearchParams();

  function updateStatus(status: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }

    params.delete("page");

    const query = params.toString();

    router.push(query ? `/orders?${query}` : "/orders");
  }

  return (
    <FilterDropdown
      value={initialStatus}
      onChange={updateStatus}
      placeholder="All Orders"
      className="w-full sm:w-48"
      options={STATUS_OPTIONS}
    />
  );
}
