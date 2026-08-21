import { notFound } from "next/navigation";

import AdminProductForm from "@/components/admin/products/admin-product-form";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditAdminProductPage({ params }: PageProps) {
  const { id } = await params;

  const [product, categories, colors, sizes] = await Promise.all([
    prisma.product.findUnique({
      where: {
        id,
      },

      include: {
        images: {
          orderBy: {
            position: "asc",
          },
        },

        variants: {
          include: {
            color: true,
            size: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    }),

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
        isActive: true,
      },
    }),

    prisma.size.findMany({
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],

      select: {
        id: true,
        name: true,
        sortOrder: true,
        isActive: true,
      },
    }),
  ]);

  if (!product) {
    notFound();
  }

  const productVariants = product.variants.map((variant) => ({
    id: variant.id,

    sku: variant.sku,

    price: Number(variant.price),

    stock: variant.stock,

    colorId: variant.colorId,

    colorName: variant.color?.name ?? null,

    sizeId: variant.sizeId,

    sizeName: variant.size?.name ?? null,

    /*
     * Existing optional
     * variant image.
     */
    imageUrl: variant.imageUrl ?? null,

    imagePublicId: variant.imagePublicId ?? null,
  }));

  const baseSku = productVariants.length === 1 ? productVariants[0].sku : "";

  return (
    <AdminProductForm
      categories={categories}
      colors={colors}
      sizes={sizes}
      initialData={{
        id: product.id,

        name: product.name,

        description: product.description ?? "",

        categoryId: product.categoryId,

        isActive: product.isActive,

        images: product.images.map((image) => ({
          id: image.id,

          url: image.url,

          publicId: image.publicId,

          colorId: image.colorId,

          isPrimary: image.isPrimary,

          position: image.position,
        })),

        baseSku,

        variants: productVariants,
      }}
    />
  );
}
