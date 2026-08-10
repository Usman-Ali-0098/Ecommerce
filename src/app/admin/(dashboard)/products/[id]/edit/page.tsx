import {
  notFound,
} from "next/navigation";

import AdminProductForm from "@/components/admin/products/admin-product-form";

import {
  prisma,
} from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditAdminProductPage({
  params,
}: PageProps) {
  const { id } =
    await params;

  const [
    product,
    categories,
    colors,
    sizes,
  ] =
    await Promise.all([
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
              createdAt:
                "asc",
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

  if (!product) {
    notFound();
  }

  const image =
    product.images.find(
      (item) =>
        item.isPrimary
    ) ??
    product.images[0] ??
    null;

  const productVariants =
    product.variants.map(
      (variant) => ({
        id:
          variant.id,

        sku:
          variant.sku,

        price:
          Number(
            variant.price
          ),

        stock:
          variant.stock,

        colorId:
          variant.colorId,

        colorName:
          variant.color
            ?.name ??
          null,

        sizeId:
          variant.sizeId,

        sizeName:
          variant.size
            ?.name ??
          null,
      })
    );

  /*
   * For a simple product,
   * use its only SKU as base.
   *
   * For variable product we
   * initially use the first SKU.
   *
   * The form preserves the actual
   * existing SKU of every variant.
   */
  const baseSku =
    productVariants.length ===
    1
      ? productVariants[0].sku
      : "";

  return (
    <AdminProductForm
      categories={
        categories
      }
      colors={colors}
      sizes={sizes}
      initialData={{
        id:
          product.id,

        name:
          product.name,

        description:
          product.description ??
          "",

        categoryId:
          product.categoryId,

        isActive:
          product.isActive,

        imageUrl:
          image?.url ??
          "",

        imagePublicId:
          image?.publicId ??
          "",

        baseSku,

        variants:
          productVariants,
      }}
    />
  );
}