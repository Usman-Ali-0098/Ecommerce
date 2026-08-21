"use client";

import {
  useState,
  type FormEvent,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

type AdminProductFiltersProps = {
  categories: CategoryOption[];
  initialSearch: string;
  initialCategory: string;
};

export default function AdminProductFilters({
  categories,
  initialSearch,
  initialCategory,
}: AdminProductFiltersProps) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const [
    search,
    setSearch,
  ] = useState(
    initialSearch
  );

  function updateUrl(
    updates: {
      search?: string;
      category?: string;
    }
  ) {
    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    if (
      updates.search !==
      undefined
    ) {
      const value =
        updates.search.trim();

      if (value) {
        params.set(
          "search",
          value
        );
      } else {
        params.delete(
          "search"
        );
      }
    }

    if (
      updates.category !==
      undefined
    ) {
      if (
        updates.category
      ) {
        params.set(
          "category",
          updates.category
        );
      } else {
        params.delete(
          "category"
        );
      }
    }

    params.delete(
      "page"
    );

    const query =
      params.toString();

    router.push(
      query
        ? `/admin/products?${query}`
        : "/admin/products"
    );
  }

  function handleSearch(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    updateUrl({
      search,
    });
  }

  function handleSearchChange(
    value: string
  ) {
    setSearch(value);

    if (
      !value &&
      initialSearch
    ) {
      updateUrl({
        search: "",
      });
    }
  }

  function handleClear() {
    setSearch("");

    router.push(
      "/admin/products"
    );
  }

  const hasFilters =
    Boolean(
      initialSearch ||
      initialCategory
    );

  return (
    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
      {/* Search */}

      <form
        onSubmit={
          handleSearch
        }
        className="flex min-w-0 flex-1 gap-2"
      >
        <div className="relative min-w-0 flex-1">
          <SearchIcon />

          <input
            type="search"
            value={search}
            onChange={(
              event
            ) =>
              handleSearchChange(
                event.target
                  .value
              )
            }
            placeholder="Search by product name..."
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-medium text-white transition hover:bg-blue-700 cursor-pointer"
        >
          Search
        </button>
      </form>

      {/* Category */}

      <div className="flex items-center gap-2">
        <div className="relative min-w-[180px] flex-1 lg:flex-none">
          <select
            value={
              initialCategory
            }
            onChange={(
              event
            ) =>
              updateUrl({
                category:
                  event.target
                    .value,
              })
            }
            className="h-9 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-9 text-xs text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">
              All Categories
            </option>

            {categories.map(
              (category) => (
                <option
                  key={
                    category.id
                  }
                  value={
                    category.slug
                  }
                >
                  {
                    category.name
                  }
                </option>
              )
            )}
          </select>

          <SelectArrowIcon />
        </div>

        {hasFilters ? (
          <button
            type="button"
            onClick={
              handleClear
            }
            className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
      aria-hidden="true"
    >
      <circle
        cx="8.5"
        cy="8.5"
        r="4.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M12 12L16 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SelectArrowIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
      aria-hidden="true"
    >
      <path
        d="M6 8L10 12L14 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
