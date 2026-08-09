import AdminProductForm from "@/components/admin/products/admin-product-form";

import { prisma } from "@/lib/prisma";

export default async function NewAdminProductPage() {
  const [categories, colors, sizes] =
    await Promise.all([
      prisma.category.findMany({
        orderBy: {
          name: "asc",
        },

        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      }),

      prisma.color.findMany({
        orderBy: {
          name: "asc",
        },

        select: {
          id: true,
          name: true,
          hexacode: true,
        },
      }),

      prisma.size.findMany({
        orderBy: {
          name: "asc",
        },

        select: {
          id: true,
          name: true,
        },
      }),
    ]);

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Add Product
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Create a new product for your store.
        </p>
      </div>

      <AdminProductForm
        categories={categories}
        colors={colors}
        sizes={sizes}
      />
    </section>
  );
}