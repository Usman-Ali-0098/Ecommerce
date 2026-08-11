import type {
  PublicProduct,
} from "@/types/product";

import ProductCard from "@/components/products/product-card";

type ProductGridProps = {
  products: PublicProduct[];
};

export default function ProductGrid({
  products,
}: ProductGridProps) {
  if (
    products.length === 0
  ) {
    return (
      <div className="rounded-md border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-sm font-medium text-gray-800">
          No products found
        </p>

        <p className="mt-1 text-xs text-gray-500">
          Try changing your search
          or filters.
        </p>
      </div>
    );
  }

  return (
    <div
      className="
        grid
        grid-cols-1
        gap-5
        min-[420px]:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-4
      "
    >
      {products.map(
        (product) => (
          <ProductCard
            key={
              product.id
            }
            product={
              product
            }
          />
        )
      )}
    </div>
  );
}