import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/validate-request";
import { createAdminProductSchema } from "@/lib/validations/admin-product";

class RouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getUniqueSlug(name: string) {
  const baseSlug = createSlug(name) || "product";

  const existing = await prisma.product.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  });

  if (!existing) {
    return baseSlug;
  }

  let counter = 2;

  while (true) {
    const candidate = `${baseSlug}-${counter}`;

    const exists = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!exists) {
      return candidate;
    }

    counter++;
  }
}

async function cleanupCloudinaryImages(publicIds: string[]) {
  const uniquePublicIds = [...new Set(publicIds.filter(Boolean))];

  await Promise.allSettled(
    uniquePublicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
      }),
    ),
  );
}

export async function POST(request: Request) {
  let uploadedPublicIds: string[] = [];

  try {
    const admin = await getAdminSession();

    if (!admin) {
      throw new RouteError("Admin authentication required.", 401);
    }

    const validation = validateRequest(
      createAdminProductSchema,
      await request.json(),
    );

    if (!validation.success) {
      return validation.response;
    }

    const { name, description, categoryId, isActive, images, variants } =
      validation.data;

    const variantColorIds = new Set(
      variants
        .map((variant) => variant.colorId)
        .filter((value): value is string => value !== null),
    );

    if (
      images.some(
        (image) => image.colorId && !variantColorIds.has(image.colorId),
      )
    ) {
      throw new RouteError(
        "Every color-specific image must match a product variant color.",
      );
    }

    /*
     * These files have already been uploaded by the admin form.
     * If validation/DB save fails, clean them from Cloudinary.
     */
    uploadedPublicIds = [
      ...images.map((image) => image.publicId),
      ...variants
        .map((variant) => variant.imagePublicId)
        .filter((value): value is string => Boolean(value)),
    ];

    const primaryCount = images.filter((image) => image.isPrimary).length;

    if (images.length > 0 && primaryCount !== 1) {
      throw new RouteError("Select exactly one primary product image.");
    }

    const requestSkus = variants.map((variant) => variant.sku.toLowerCase());

    if (new Set(requestSkus).size !== requestSkus.length) {
      throw new RouteError("Every variant must have a unique SKU.");
    }

    const combinationKeys = variants.map(
      (variant) => `${variant.colorId ?? "null"}:${variant.sizeId ?? "null"}`,
    );

    if (new Set(combinationKeys).size !== combinationKeys.length) {
      throw new RouteError("Duplicate product variant combination detected.");
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, isActive: true },
    });

    if (!category) {
      throw new RouteError("Selected category does not exist.");
    }

    const existingSku = await prisma.productVariant.findFirst({
      where: {
        sku: {
          in: variants.map((variant) => variant.sku),
        },
      },
      select: { sku: true },
    });

    if (existingSku) {
      throw new RouteError(`SKU ${existingSku.sku} already exists.`, 409);
    }

    const colorIds = [
      ...new Set(
        [...variants.map((variant) => variant.colorId), ...images.map((image) => image.colorId)]
          .filter((id): id is string => id !== null),
      ),
    ];

    if (colorIds.length > 0) {
      const colorCount = await prisma.color.count({
        where: {
          id: { in: colorIds },
          isActive: true,
        },
      });

      if (colorCount !== colorIds.length) {
        throw new RouteError(
          "One or more selected colors are invalid or inactive.",
        );
      }
    }

    const sizeIds = [
      ...new Set(
        variants
          .map((variant) => variant.sizeId)
          .filter((id): id is string => id !== null),
      ),
    ];

    if (sizeIds.length > 0) {
      const sizeCount = await prisma.size.count({
        where: {
          id: { in: sizeIds },
          isActive: true,
        },
      });

      if (sizeCount !== sizeIds.length) {
        throw new RouteError(
          "One or more selected sizes are invalid or inactive.",
        );
      }
    }

    const slug = await getUniqueSlug(name);

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name,
          slug,
          description: description || null,
          categoryId,
          isActive,
        },
      });

      if (images.length > 0) {
        await tx.productImage.createMany({
          data: images.map((image, index) => ({
            productId: newProduct.id,
            url: image.url,
          publicId: image.publicId,
          colorId: image.colorId,
          altText: name,
            isPrimary: image.isPrimary,
            position: image.position ?? index,
          })),
        });
      }

      await tx.productVariant.createMany({
        data: variants.map((variant) => ({
          productId: newProduct.id,
          sku: variant.sku,
          price: variant.price,
          stock: variant.stock,
          colorId: variant.colorId,
          sizeId: variant.sizeId,
          imageUrl: variant.imageUrl,
          imagePublicId: variant.imagePublicId,
          isActive: true,
        })),
      });

      return newProduct;
    });

    /*
     * Product is saved successfully.
     * Do not clean uploaded Cloudinary files.
     */
    uploadedPublicIds = [];

    return NextResponse.json(
      {
        success: true,
        message: "Product created successfully.",
        data: {
          id: product.id,
          name: product.name,
          slug: product.slug,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (uploadedPublicIds.length > 0) {
      await cleanupCloudinaryImages(uploadedPublicIds);
    }

    if (error instanceof RouteError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.status },
      );
    }

    console.error("Admin create product error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while creating the product.",
      },
      { status: 500 },
    );
  }
}
