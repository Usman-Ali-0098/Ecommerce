import ProductImportClient from "@/components/admin/products/product-import-client";
import { prisma } from "@/lib/prisma";

export default async function ImportProductsPage() {
  const [categories, colors, sizes] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.color.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, hexacode: true },
    }),
    prisma.size.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Import Products</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV, review and edit each product, then submit — products are created in the
          background so you can keep working while a large batch processes.
        </p>
      </div>

      <ProductImportClient categories={categories} colors={colors} sizes={sizes} />
    </section>
  );
}
