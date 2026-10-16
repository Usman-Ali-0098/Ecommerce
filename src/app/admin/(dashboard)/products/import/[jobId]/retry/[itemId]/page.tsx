import { notFound } from "next/navigation";

import AdminProductForm from "@/components/admin/products/admin-product-form";
import { prisma } from "@/lib/prisma";
import { findByName } from "@/lib/bulk-import-types";

type PageProps = {
  params: Promise<{ jobId: string; itemId: string }>;
};

type RawRowVariant = {
  colorName?: string;
  sizeName?: string;
  sku?: string;
  price?: string;
  stock?: string;
  imageFilename?: string;
};

type RawRow = {
  name?: string;
  description?: string;
  categoryName?: string;
  variants?: RawRowVariant[];
};

export default async function RetryImportItemPage({ params }: PageProps) {
  const { jobId, itemId } = await params;

  const item = await prisma.jobRunItem.findUnique({ where: { id: itemId } });
  if (!item || item.jobRunId !== jobId || item.status !== "FAILED") {
    notFound();
  }

  const [categories, colors, sizes] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, isActive: true },
    }),
    prisma.color.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, hexacode: true, isActive: true },
    }),
    prisma.size.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sortOrder: true, isActive: true },
    }),
  ]);

  const rawRow = (item.rawRow as RawRow | null) ?? {};
  const rawVariants = rawRow.variants ?? [];

  // If any of this row's SKUs already belong to a real product, the admin
  // should be editing THAT product (so its other variants/images aren't
  // dropped) -- not creating a duplicate. Route into normal edit mode.
  const skus = rawVariants
    .map((v) => (v.sku ?? "").trim().toUpperCase())
    .filter(Boolean);

  const existingVariant = skus.length
    ? await prisma.productVariant.findFirst({
        where: { sku: { in: skus } },
        select: { productId: true },
      })
    : null;

  if (existingVariant) {
    const product = await prisma.product.findUnique({
      where: { id: existingVariant.productId },
      include: {
        images: { orderBy: { position: "asc" } },
        variants: { include: { color: true, size: true }, orderBy: { createdAt: "asc" } },
      },
    });

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
        retryContext={{ jobId, itemId, errorMessage: item.message ?? undefined }}
      />
    );
  }

  // No existing product for these SKUs -- prefill a blank create with
  // whatever the CSV row actually had, matching category/color/size by name.
  const category = findByName(categories, rawRow.categoryName ?? "");

  const prefillVariants = rawVariants.map((variant) => {
    const color = variant.colorName ? findByName(colors, variant.colorName) : undefined;
    const size = variant.sizeName ? findByName(sizes, variant.sizeName) : undefined;
    return {
      sku: variant.sku ?? "",
      price: Number(variant.price) || 0,
      stock: Number(variant.stock) || 0,
      colorId: color?.id ?? null,
      colorName: variant.colorName ?? color?.name ?? null,
      sizeId: size?.id ?? null,
      sizeName: variant.sizeName ?? size?.name ?? null,
    };
  });

  // The prop's `variants` array must keep the one entry even for a simple
  // product -- AdminProductForm reads seed.variants[0] to prefill price/
  // quantity, and decides on its own (via its initialIsSimple check) whether
  // to render it as a simple product or a variants table.
  const baseSku = prefillVariants.length === 1 ? prefillVariants[0].sku : "";

  return (
    <AdminProductForm
      categories={categories}
      colors={colors}
      sizes={sizes}
      prefill={{
        name: rawRow.name ?? "",
        description: rawRow.description ?? "",
        categoryId: category?.id ?? "",
        isActive: true,
        baseSku,
        variants: prefillVariants,
      }}
      retryContext={{ jobId, itemId, errorMessage: item.message ?? undefined }}
    />
  );
}
