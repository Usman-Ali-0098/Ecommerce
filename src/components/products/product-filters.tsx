"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useState } from "react";

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

  const [search, setSearch] = useState(searchParams.get("search") ?? "");

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

  return (
    <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
      {/* Category */}

      <select
        value={currentCategory}
        onChange={(event) =>
          updateParams("category", event.target.value || undefined)
        }
        className="h-9 w-full min-w-0 rounded-md border border-[#d8dee8] bg-white px-3 text-xs text-gray-600 outline-none transition focus:border-[#087ff5]"
      >
        <option value="">All Categories</option>

        {categories.map((category) => (
          <option key={category.id} value={category.slug}>
            {category.name}
          </option>
        ))}
      </select>

      {/* Search */}

      <form
        onSubmit={handleSearchSubmit}
        className="relative min-w-0 w-full sm:flex-1 lg:w-[320px] lg:flex-none"
      >
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
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

      <select
        value={currentSort}
        onChange={(event) => {
          const value = event.target.value;

          updateParams("sort", value === "newest" ? undefined : value);
        }}
        className="h-9 w-full rounded-md border border-[#d8dee8] bg-white px-3 text-xs text-gray-600 outline-none transition focus:border-[#087ff5]"
      >
        <option value="newest">Newest</option>

        <option value="oldest">Oldest</option>

        <option value="price-low">Price: Low to High</option>

        <option value="price-high">Price: High to Low</option>
      </select>
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
