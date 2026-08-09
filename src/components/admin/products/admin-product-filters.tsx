"use client";

import {
  useState,
} from "react";

import type {
  FormEvent,
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

    /*
     * Search
     */
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

    /*
     * Category
     *
     * Notice:
     * We use category.slug
     * in the URL, not category.id.
     */
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

    /*
     * Whenever filters change,
     * return to page 1.
     */
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
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    updateUrl({
      search,
    });
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      {/* Search */}
      <form
        onSubmit={
          handleSearch
        }
        className="flex flex-1 gap-2"
      >
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search products..."
          className="h-11 w-full rounded-md border border-gray-300 bg-white px-4 text-sm outline-none transition focus:border-[#087ff5]"
        />

        <button
          type="submit"
          className="h-11 rounded-md bg-[#087ff5] px-5 text-sm font-medium text-white transition hover:bg-[#066ed6]"
        >
          Search
        </button>
      </form>

      {/* Category */}
      <select
        value={
          initialCategory
        }
        onChange={(event) =>
          updateUrl({
            category:
              event.target.value,
          })
        }
        className="h-11 min-w-[200px] rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#087ff5]"
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
              {category.name}
            </option>
          )
        )}
      </select>
    </div>
  );
}