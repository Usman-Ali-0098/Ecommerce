"use client";

import { useRouter, useSearchParams } from "next/navigation";

type OrdersPaginationProps = {
  page: number;
  totalPages: number;
};

export default function OrdersPagination({
  page,
  totalPages,
}: OrdersPaginationProps) {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  if (totalPages <= 1) {
    return null;
  }

  function goToPage(
    nextPage: number
  ) {
    if (
      nextPage < 1 ||
      nextPage > totalPages ||
      nextPage === page
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    if (nextPage === 1) {
      params.delete("page");
    } else {
      params.set(
        "page",
        String(nextPage)
      );
    }

    const query =
      params.toString();

    router.push(
      query
        ? `/orders?${query}`
        : "/orders"
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() =>
          goToPage(page - 1)
        }
        disabled={page === 1}
        className="h-10 rounded-l-md border border-gray-300 bg-white px-4 text-sm text-[#087ff5] disabled:cursor-not-allowed disabled:text-gray-300"
      >
        Previous
      </button>

      {Array.from(
        { length: totalPages },
        (_, index) => index + 1
      )
        .slice(
          Math.max(0, page - 3),
          Math.min(
            totalPages,
            page + 2
          )
        )
        .map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() =>
              goToPage(pageNumber)
            }
            className={`h-10 min-w-10 border-y border-r border-gray-300 px-3 text-sm ${
              pageNumber === page
                ? "bg-[#087ff5] text-white"
                : "bg-white text-[#087ff5]"
            }`}
          >
            {pageNumber}
          </button>
        ))}

      <button
        type="button"
        onClick={() =>
          goToPage(page + 1)
        }
        disabled={
          page === totalPages
        }
        className="h-10 rounded-r-md border-y border-r border-gray-300 bg-white px-4 text-sm text-[#087ff5] disabled:cursor-not-allowed disabled:text-gray-300"
      >
        Next
      </button>
    </div>
  );
}