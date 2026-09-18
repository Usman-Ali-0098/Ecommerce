"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useEffect, useState } from "react";

import FilterDropdown from "@/components/products/filter-dropdown";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
];

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ProductFiltersProps = {
  categories: Category[];
};

export default function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();

  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") ?? "";

  const currentSort = searchParams.get("sort") ?? "newest";

  const currentSearch = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(currentSearch);

  useEffect(() => {
    const normalizedSearch = search.trim();

    if (normalizedSearch === currentSearch) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (normalizedSearch) {
        params.set("search", normalizedSearch);
      } else {
        params.delete("search");
      }

      params.delete("page");

      const query = params.toString();

      router.push(query ? `/?${query}` : "/");
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [currentSearch, router, search, searchParams]);

  function updateParams(key: string, value?: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    params.delete("page");

    const query = params.toString();

    router.push(query ? `/?${query}` : "/");
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    updateParams("search", search.trim() || undefined);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  return (
    <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
      {/* Category */}

      <FilterDropdown
        value={currentCategory}
        onChange={(value) => updateParams("category", value || undefined)}
        placeholder="All Categories"
        searchable
        searchPlaceholder="Search categories..."
        className="w-full lg:w-52"
        options={[
          { value: "", label: "All Categories" },
          ...categories.map((category) => ({
            value: category.slug,
            label: category.name,
          })),
        ]}
      />

      {/* Search */}

      <form
        onSubmit={handleSearchSubmit}
        className="relative min-w-0 w-full sm:flex-1 lg:w-[320px] lg:flex-none"
      >
        <input
          type="search"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Search products..."
          className="h-9 w-full min-w-0 rounded-md border border-[#d8dee8] bg-white pl-3 pr-9 text-xs text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#087ff5]"
        />

        <button
          type="submit"
          aria-label="Search"
          className="absolute right-0 top-0 flex h-9 w-9 shrink-0 items-center justify-center border-l border-[#e1e5eb] text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
        >
          <SearchIcon />
        </button>
      </form>

      {/* Sort */}

      <FilterDropdown
        value={currentSort}
        onChange={(value) =>
          updateParams("sort", value === "newest" ? undefined : value)
        }
        className="w-full lg:w-48"
        options={SORT_OPTIONS}
      />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />

      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
