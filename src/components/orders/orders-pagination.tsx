"use client";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

type OrdersPaginationProps = {
  page: number;
  totalPages: number;
};

export default function OrdersPagination({
  page,
  totalPages,
}: OrdersPaginationProps) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  if (
    totalPages <= 1
  ) {
    return null;
  }

  function goToPage(
    nextPage: number
  ) {
    if (
      nextPage < 1 ||
      nextPage >
        totalPages ||
      nextPage === page
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    if (
      nextPage === 1
    ) {
      params.delete(
        "page"
      );
    } else {
      params.set(
        "page",
        String(
          nextPage
        )
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

  const visiblePages =
    getVisiblePages(
      page,
      totalPages
    );

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() =>
          goToPage(
            page - 1
          )
        }
        disabled={
          page === 1
        }
        className="h-8 rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-600 transition hover:border-[#087ff5] hover:text-[#087ff5] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      {visiblePages.map(
        (
          item,
          index
        ) =>
          item ===
          "..." ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-8 min-w-8 items-center justify-center text-xs text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={
                item
              }
              type="button"
              onClick={() =>
                goToPage(
                  item
                )
              }
              aria-current={
                item === page
                  ? "page"
                  : undefined
              }
              className={`h-8 min-w-8 rounded-md border px-2 text-xs font-medium transition ${
                item === page
                  ? "border-[#087ff5] bg-[#087ff5] text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:border-[#087ff5] hover:text-[#087ff5]"
              }`}
            >
              {item}
            </button>
          )
      )}

      <button
        type="button"
        onClick={() =>
          goToPage(
            page + 1
          )
        }
        disabled={
          page ===
          totalPages
        }
        className="h-8 rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-600 transition hover:border-[#087ff5] hover:text-[#087ff5] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

function getVisiblePages(
  currentPage: number,
  totalPages: number
): Array<
  number | "..."
> {
  if (
    totalPages <= 7
  ) {
    return Array.from(
      {
        length:
          totalPages,
      },
      (
        _,
        index
      ) =>
        index + 1
    );
  }

  if (
    currentPage <= 4
  ) {
    return [
      1,
      2,
      3,
      4,
      5,
      "...",
      totalPages,
    ];
  }

  if (
    currentPage >=
    totalPages - 3
  ) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}