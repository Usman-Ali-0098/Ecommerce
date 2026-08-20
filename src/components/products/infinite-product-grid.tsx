"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ProductGrid from "@/components/products/product-grid";

import type { PublicProduct } from "@/types/product";

import type { ProductSort } from "@/lib/services/product.service";

type InfiniteProductGridProps = {
  initialProducts: PublicProduct[];

  initialPage: number;

  totalPages: number;

  category?: string;

  search?: string;

  sort: ProductSort;
};

type ProductsApiResponse = {
  success: boolean;

  data?: {
    products: PublicProduct[];

    pagination: {
      page: number;

      pageSize: number;

      total: number;

      totalPages: number;
    };
  };

  message?: string;
};

const PAGE_SIZE = 12;

export default function InfiniteProductGrid({
  initialProducts,
  initialPage,
  totalPages,
  category,
  search,
  sort,
}: InfiniteProductGridProps) {
  const [products, setProducts] = useState<PublicProduct[]>(initialProducts);

  const [currentPage, setCurrentPage] = useState(initialPage);

  const [isLoading, setIsLoading] = useState(false);

  const [loadError, setLoadError] = useState("");

  const loaderRef = useRef<HTMLDivElement | null>(null);

  /*
   * Prevent duplicate requests
   * if IntersectionObserver fires
   * multiple times quickly.
   */
  const loadingRef = useRef(false);

  const hasMore = currentPage < totalPages;

  //  LOAD NEXT PAGE

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) {
      return;
    }

    const nextPage = currentPage + 1;

    try {
      loadingRef.current = true;

      setIsLoading(true);

      setLoadError("");

      const params = new URLSearchParams();

      params.set("page", String(nextPage));

      params.set("pageSize", String(PAGE_SIZE));

      /*
       * Keep current filters.
       */
      if (category) {
        params.set("category", category);
      }

      if (search) {
        params.set("search", search);
      }

      if (sort !== "newest") {
        params.set("sort", sort);
      }

      const response = await fetch(`/api/products?${params.toString()}`);

      const result = (await response.json()) as ProductsApiResponse;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message ?? "Unable to load more products.");
      }

      setProducts((current) => {
        const existingIds = new Set(current.map((product) => product.id));

        // This removes duplicates.
        const newProducts = result.data!.products.filter(
          (product) => !existingIds.has(product.id),
        );

        return [...current, ...newProducts];
      });

      setCurrentPage(result.data.pagination.page);
    } catch (error) {
      console.error("Load more products error:", error);

      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load more products.",
      );
    } finally {
      loadingRef.current = false;

      setIsLoading(false);
    }
  }, [category, currentPage, hasMore, search, sort]);

  //  WATCH FOR SCROLL

  useEffect(() => {
    const element = loaderRef.current;

    if (!element || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting) {
          void loadMore();
        }
      },

      {
        /*
         * Start loading before
         * the user reaches the
         * exact bottom.
         */
        rootMargin: "400px 0px",
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore]);

  return (
    <>
      <ProductGrid products={products} />

      {hasMore ? (
        <div
          ref={loaderRef}
          className="flex min-h-20 items-center justify-center py-5"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#087ff5]" />
              Loading more products...
            </div>
          ) : loadError ? (
            <button
              type="button"
              onClick={() => void loadMore()}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-[11px] font-medium text-gray-600 transition hover:border-[#087ff5] hover:text-[#087ff5]"
            >
              Try Again
            </button>
          ) : null}
        </div>
      ) : products.length > 0 ? (
        <p className="py-6 text-center text-[10px] text-gray-400">
          No more products
        </p>
      ) : null}
    </>
  );
}
