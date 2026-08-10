"use client";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

type Props = {
  page: number;
  totalPages: number;
};

export default function AdminOrdersPagination({
  page,
  totalPages,
}: Props) {
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

    if (nextPage === 1) {
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
        ? `/admin/orders?${query}`
        : "/admin/orders"
    );
  }

  const pageNumbers =
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
        title="Previous page"
        aria-label="Previous page"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <PreviousIcon />
      </button>

      {pageNumbers.map(
        (
          pageNumber,
          index
        ) => {
          if (
            pageNumber ===
            "ellipsis"
          ) {
            return (
              <span
                key={`ellipsis-${index}`}
                className="flex h-8 min-w-8 items-center justify-center px-1 text-xs text-gray-400"
              >
                ...
              </span>
            );
          }

          const active =
            pageNumber ===
            page;

          return (
            <button
              key={
                pageNumber
              }
              type="button"
              onClick={() =>
                goToPage(
                  pageNumber
                )
              }
              aria-current={
                active
                  ? "page"
                  : undefined
              }
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {
                pageNumber
              }
            </button>
          );
        }
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
        title="Next page"
        aria-label="Next page"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <NextIcon />
      </button>
    </div>
  );
}

type VisiblePage =
  | number
  | "ellipsis";

function getVisiblePages(
  page: number,
  totalPages: number
): VisiblePage[] {
  if (
    totalPages <= 7
  ) {
    return Array.from(
      {
        length:
          totalPages,
      },
      (_, index) =>
        index + 1
    );
  }

  if (page <= 4) {
    return [
      1,
      2,
      3,
      4,
      5,
      "ellipsis",
      totalPages,
    ];
  }

  if (
    page >=
    totalPages - 3
  ) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    page - 1,
    page,
    page + 1,
    "ellipsis",
    totalPages,
  ];
}

function PreviousIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M12 5L7 10L12 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M8 5L13 10L8 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}