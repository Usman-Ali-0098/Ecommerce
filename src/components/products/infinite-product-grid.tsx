"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import ProductGrid from "@/components/products/product-grid";
import type { ProductSort } from "@/lib/services/product.service";
import type { PublicProduct } from "@/types/product";

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

type LoadDirection = "previous" | "next";

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
  const [lowestLoadedPage, setLowestLoadedPage] = useState(initialPage);
  const [highestLoadedPage, setHighestLoadedPage] = useState(initialPage);
  const [loadingDirection, setLoadingDirection] =
    useState<LoadDirection | null>(null);
  const [loadError, setLoadError] = useState<{
    direction: LoadDirection;
    message: string;
  } | null>(null);

  const topLoaderRef = useRef<HTMLDivElement | null>(null);
  const bottomLoaderRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const heightBeforePrependRef = useRef<number | null>(null);

  const hasPrevious = lowestLoadedPage > 1;
  const hasNext = highestLoadedPage < totalPages;

  useLayoutEffect(() => {
    const previousHeight = heightBeforePrependRef.current;

    if (previousHeight === null) {
      return;
    }

    const heightDifference =
      document.documentElement.scrollHeight - previousHeight;

    window.scrollBy(0, heightDifference);
    heightBeforePrependRef.current = null;
  }, [products]);

  const loadPage = useCallback(
    async (direction: LoadDirection) => {
      const page =
        direction === "previous"
          ? lowestLoadedPage - 1
          : highestLoadedPage + 1;

      if (loadingRef.current || page < 1 || page > totalPages) {
        return;
      }

      try {
        loadingRef.current = true;
        setLoadingDirection(direction);
        setLoadError(null);

        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });

        if (category) params.set("category", category);
        if (search) params.set("search", search);
        if (sort !== "newest") params.set("sort", sort);

        const response = await fetch(`/api/products?${params.toString()}`);
        const result = (await response.json()) as ProductsApiResponse;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message ?? "Unable to load products.");
        }

        if (direction === "previous") {
          heightBeforePrependRef.current = document.documentElement.scrollHeight;
        }

        setProducts((current) => {
          const existingIds = new Set(current.map((product) => product.id));
          const newProducts = result.data!.products.filter(
            (product) => !existingIds.has(product.id),
          );

          return direction === "previous"
            ? [...newProducts, ...current]
            : [...current, ...newProducts];
        });

        if (direction === "previous") {
          setLowestLoadedPage(result.data.pagination.page);
        } else {
          setHighestLoadedPage(result.data.pagination.page);
        }
      } catch (error) {
        console.error(`Load ${direction} products error:`, error);
        setLoadError({
          direction,
          message:
            error instanceof Error ? error.message : "Unable to load products.",
        });
      } finally {
        loadingRef.current = false;
        setLoadingDirection(null);
      }
    },
    [category, highestLoadedPage, lowestLoadedPage, search, sort, totalPages],
  );

  useEffect(() => {
    const element = topLoaderRef.current;
    if (!element || !hasPrevious) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadPage("previous");
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasPrevious, loadPage]);

  useEffect(() => {
    const element = bottomLoaderRef.current;
    if (!element || !hasNext) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadPage("next");
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNext, loadPage]);

  return (
    <>
      {hasPrevious ? (
        <Loader
          loaderRef={topLoaderRef}
          isLoading={loadingDirection === "previous"}
          hasError={loadError?.direction === "previous"}
          label="Loading previous products..."
          onRetry={() => void loadPage("previous")}
        />
      ) : null}

      <ProductGrid products={products} />

      {hasNext ? (
        <Loader
          loaderRef={bottomLoaderRef}
          isLoading={loadingDirection === "next"}
          hasError={loadError?.direction === "next"}
          label="Loading more products..."
          onRetry={() => void loadPage("next")}
        />
      ) : products.length > 0 ? (
        <p className="py-6 text-center text-[10px] text-gray-400">
          No more products
        </p>
      ) : null}
    </>
  );
}

type LoaderProps = {
  loaderRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  hasError: boolean;
  label: string;
  onRetry: () => void;
};

function Loader({
  loaderRef,
  isLoading,
  hasError,
  label,
  onRetry,
}: LoaderProps) {
  return (
    <div
      ref={loaderRef}
      className="flex min-h-20 items-center justify-center py-5"
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#087ff5]" />
          {label}
        </div>
      ) : hasError ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-[11px] font-medium text-gray-600 transition hover:border-[#087ff5] hover:text-[#087ff5]"
        >
          Try Again
        </button>
      ) : null}
    </div>
  );
}
