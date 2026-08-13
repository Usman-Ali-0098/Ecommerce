import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type VariantInput = {
  id?: string;
  sku: string;
  price: number;
  stock: number;
  colorId: string | null;
  sizeId: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
};

type ImageInput =
  | {
      source: "existing";
      id: string;
      position: number;
      isPrimary: boolean;
    }
  | {
      source: "new";
      url: string;
      publicId: string;
      position: number;
      isPrimary: boolean;
    };

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

async function getUniqueSlug(name: string, productId: string) {
  const baseSlug = createSlug(name) || "product";

  const existing = await prisma.product.findFirst({
    where: {
      slug: baseSlug,
      NOT: { id: productId },
    },
    select: { id: true },
  });

  if (!existing) {
    return baseSlug;
  }

  let counter = 2;

  while (true) {
    const candidate = `${baseSlug}-${counter}`;

    const exists = await prisma.product.findFirst({
      where: {
        slug: candidate,
        NOT: { id: productId },
      },
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

function normalizeImages(value: unknown): ImageInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((rawImage, index) => {
    const source = rawImage?.source;

    const positionValue = Number(rawImage?.position);

    const position =
      Number.isInteger(positionValue) && positionValue >= 0
        ? positionValue
        : index;

    const isPrimary = rawImage?.isPrimary === true;

    if (source === "existing") {
      const id = typeof rawImage?.id === "string" ? rawImage.id.trim() : "";

      if (!id) {
        throw new RouteError("Invalid existing product image.");
      }

      return {
        source: "existing",
        id,
        position,
        isPrimary,
      };
    }

    if (source === "new") {
      const url = typeof rawImage?.url === "string" ? rawImage.url.trim() : "";

      const publicId =
        typeof rawImage?.publicId === "string" ? rawImage.publicId.trim() : "";

      if (!url || !publicId) {
        throw new RouteError("Invalid new product image.");
      }

      return {
        source: "new",
        url,
        publicId,
        position,
        isPrimary,
      };
    }

    throw new RouteError("Invalid product image information.");
  });
}

function normalizeVariants(value: unknown): VariantInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RouteError("At least one variant is required.");
  }

  return value.map((rawVariant) => {
    const id =
      typeof rawVariant?.id === "string" && rawVariant.id.trim()
        ? rawVariant.id.trim()
        : undefined;

    const sku =
      typeof rawVariant?.sku === "string"
        ? rawVariant.sku.trim().toUpperCase()
        : "";

    const price = Number(rawVariant?.price);
    const stock = Number(rawVariant?.stock);

    const colorId =
      typeof rawVariant?.colorId === "string" && rawVariant.colorId.trim()
        ? rawVariant.colorId.trim()
        : null;

    const sizeId =
      typeof rawVariant?.sizeId === "string" && rawVariant.sizeId.trim()
        ? rawVariant.sizeId.trim()
        : null;

    const imageUrl =
      typeof rawVariant?.imageUrl === "string" && rawVariant.imageUrl.trim()
        ? rawVariant.imageUrl.trim()
        : null;

    const imagePublicId =
      typeof rawVariant?.imagePublicId === "string" &&
      rawVariant.imagePublicId.trim()
        ? rawVariant.imagePublicId.trim()
        : null;

    if (!sku) {
      throw new RouteError("Every variant requires an SKU.");
    }

    if (!Number.isFinite(price) || price < 0) {
      throw new RouteError(`Invalid price for ${sku}.`);
    }

    if (!Number.isInteger(stock) || stock < 0) {
      throw new RouteError(`Invalid stock for ${sku}.`);
    }

    if (Boolean(imageUrl) !== Boolean(imagePublicId)) {
      throw new RouteError(`Invalid variant image for ${sku}.`);
    }

    return {
      id,
      sku,
      price,
      stock,
      colorId,
      sizeId,
      imageUrl,
      imagePublicId,
    };
  });
}

export async function PUT(request: Request, { params }: RouteContext) {
  let newlyUploadedPublicIds: string[] = [];

  try {
    const admin = await getAdminSession();

    if (!admin) {
      throw new RouteError("Admin authentication required.", 401);
    }

    const { id } = await params;

    if (!id?.trim()) {
      throw new RouteError("Product ID is required.");
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { position: "asc" },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            imageUrl: true,
            imagePublicId: true,
          },
        },
      },
    });

    if (!existingProduct) {
      throw new RouteError("Product not found.", 404);
    }

    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";

    const description =
      typeof body?.description === "string" ? body.description.trim() : "";

    const categoryId =
      typeof body?.categoryId === "string" ? body.categoryId.trim() : "";

    const isActive = body?.isActive !== false;

    if (!name) {
      throw new RouteError("Product name is required.");
    }

    if (!categoryId) {
      throw new RouteError("Category is required.");
    }

    const images = normalizeImages(body?.images);
    const variants = normalizeVariants(body?.variants);

    /*
     * Newly-uploaded base product images.
     */
    newlyUploadedPublicIds = images
      .filter(
        (image): image is Extract<ImageInput, { source: "new" }> =>
          image.source === "new",
      )
      .map((image) => image.publicId);

    const primaryCount = images.filter((image) => image.isPrimary).length;

    if (images.length > 0 && primaryCount !== 1) {
      throw new RouteError("Select exactly one primary product image.");
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new RouteError("Selected category does not exist.");
    }

    const skuKeys = variants.map((variant) => variant.sku.toLowerCase());

    if (new Set(skuKeys).size !== skuKeys.length) {
      throw new RouteError("Every variant must have a unique SKU.");
    }

    const combinationKeys = variants.map(
      (variant) => `${variant.colorId ?? "null"}:${variant.sizeId ?? "null"}`,
    );

    if (new Set(combinationKeys).size !== combinationKeys.length) {
      throw new RouteError("Duplicate variant combination detected.");
    }

    const existingVariantMap = new Map(
      existingProduct.variants.map((variant) => [variant.id, variant]),
    );

    for (const variant of variants) {
      if (variant.id && !existingVariantMap.has(variant.id)) {
        throw new RouteError("Invalid product variant.");
      }
    }

    /*
     * Determine which submitted variant images are newly uploaded.
     *
     * Existing variant:
     *   same publicId   -> keep
     *   different ID   -> newly uploaded replacement
     *
     * New variant:
     *   any image ID   -> newly uploaded
     */
    for (const variant of variants) {
      if (!variant.imagePublicId) {
        continue;
      }

      if (!variant.id) {
        newlyUploadedPublicIds.push(variant.imagePublicId);
        continue;
      }

      const existingVariant = existingVariantMap.get(variant.id);

      if (
        existingVariant &&
        existingVariant.imagePublicId !== variant.imagePublicId
      ) {
        newlyUploadedPublicIds.push(variant.imagePublicId);
      }
    }

    newlyUploadedPublicIds = [...new Set(newlyUploadedPublicIds)];

    const duplicateSku = await prisma.productVariant.findFirst({
      where: {
        sku: {
          in: variants.map((variant) => variant.sku),
        },
        productId: { not: id },
      },
      select: { sku: true },
    });

    if (duplicateSku) {
      throw new RouteError(`SKU ${duplicateSku.sku} is already in use.`, 409);
    }

    const colorIds = [
      ...new Set(
        variants
          .map((variant) => variant.colorId)
          .filter((value): value is string => value !== null),
      ),
    ];

    if (colorIds.length > 0) {
      const count = await prisma.color.count({
        where: {
          id: { in: colorIds },
          isActive: true,
        },
      });

      if (count !== colorIds.length) {
        throw new RouteError("One or more colors are invalid or inactive.");
      }
    }

    const sizeIds = [
      ...new Set(
        variants
          .map((variant) => variant.sizeId)
          .filter((value): value is string => value !== null),
      ),
    ];

    if (sizeIds.length > 0) {
      const count = await prisma.size.count({
        where: {
          id: { in: sizeIds },
          isActive: true,
        },
      });

      if (count !== sizeIds.length) {
        throw new RouteError("One or more sizes are invalid or inactive.");
      }
    }

    const existingImageIds = new Set(
      existingProduct.images.map((image) => image.id),
    );

    const submittedExistingImageIds = images
      .filter(
        (image): image is Extract<ImageInput, { source: "existing" }> =>
          image.source === "existing",
      )
      .map((image) => image.id);

    for (const imageId of submittedExistingImageIds) {
      if (!existingImageIds.has(imageId)) {
        throw new RouteError("Invalid existing product image.");
      }
    }

    const removedImages = existingProduct.images.filter(
      (image) => !submittedExistingImageIds.includes(image.id),
    );

    const submittedExistingVariantIds = variants
      .filter(
        (
          variant,
        ): variant is VariantInput & {
          id: string;
        } => Boolean(variant.id),
      )
      .map((variant) => variant.id);

    const removedVariants = existingProduct.variants.filter(
      (variant) => !submittedExistingVariantIds.includes(variant.id),
    );

    const removedVariantIds = removedVariants.map((variant) => variant.id);

    /*
     * Existing variant images that should be deleted from Cloudinary
     * AFTER the DB update succeeds.
     *
     * This includes:
     * - image explicitly removed
     * - image replaced
     * - whole variant removed
     */
    const oldVariantImagePublicIdsToDelete: string[] = [];

    for (const existingVariant of existingProduct.variants) {
      if (!existingVariant.imagePublicId) {
        continue;
      }

      const submittedVariant = variants.find(
        (variant) => variant.id === existingVariant.id,
      );

      if (!submittedVariant) {
        oldVariantImagePublicIdsToDelete.push(existingVariant.imagePublicId);
        continue;
      }

      if (submittedVariant.imagePublicId !== existingVariant.imagePublicId) {
        oldVariantImagePublicIdsToDelete.push(existingVariant.imagePublicId);
      }
    }

    const slug = await getUniqueSlug(name, id);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name,
          slug,
          description: description || null,
          categoryId,
          isActive,
        },
      });

      if (removedVariantIds.length > 0) {
        await tx.cartItem.deleteMany({
          where: {
            variantId: {
              in: removedVariantIds,
            },
          },
        });

        await tx.productVariant.deleteMany({
          where: {
            id: { in: removedVariantIds },
            productId: id,
          },
        });
      }

      for (const variant of variants) {
        if (variant.id) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              sku: variant.sku,
              price: variant.price,
              stock: variant.stock,
              colorId: variant.colorId,
              sizeId: variant.sizeId,
              imageUrl: variant.imageUrl,
              imagePublicId: variant.imagePublicId,
              isActive,
            },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: id,
              sku: variant.sku,
              price: variant.price,
              stock: variant.stock,
              colorId: variant.colorId,
              sizeId: variant.sizeId,
              imageUrl: variant.imageUrl,
              imagePublicId: variant.imagePublicId,
              isActive,
            },
          });
        }
      }

      if (removedImages.length > 0) {
        await tx.productImage.deleteMany({
          where: {
            id: {
              in: removedImages.map((image) => image.id),
            },
            productId: id,
          },
        });
      }

      for (const image of images) {
        if (image.source === "existing") {
          await tx.productImage.update({
            where: { id: image.id },
            data: {
              altText: name,
              position: image.position,
              isPrimary: image.isPrimary,
            },
          });
        } else {
          await tx.productImage.create({
            data: {
              productId: id,
              url: image.url,
              publicId: image.publicId,
              altText: name,
              position: image.position,
              isPrimary: image.isPrimary,
            },
          });
        }
      }
    });

    /*
     * DB update succeeded.
     * Newly uploaded images are now in use, so never clean them in catch.
     */
    newlyUploadedPublicIds = [];

    const removedBaseImagePublicIds = removedImages
      .map((image) => image.publicId)
      .filter((value): value is string => Boolean(value));

    const oldPublicIdsToDelete = [
      ...removedBaseImagePublicIds,
      ...oldVariantImagePublicIdsToDelete,
    ];

    if (oldPublicIdsToDelete.length > 0) {
      await cleanupCloudinaryImages(oldPublicIdsToDelete);
    }

    return NextResponse.json({
      success: true,
      message: "Product updated successfully.",
    });
  } catch (error) {
    /*
     * Only clean files that were newly uploaded during THIS submit.
     * Existing product/variant images must never be deleted here.
     */
    if (newlyUploadedPublicIds.length > 0) {
      await cleanupCloudinaryImages(newlyUploadedPublicIds);
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

    console.error("Admin update product error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while updating the product.",
      },
      { status: 500 },
    );
  }
}

/*
 * =====================================
 * DELETE PRODUCT
 * =====================================
 */

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin authentication required.",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Load both:
     * - base ProductImage Cloudinary IDs
     * - per-variant Cloudinary IDs
     */
    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,

        images: {
          select: {
            publicId: true,
          },
        },

        variants: {
          select: {
            imagePublicId: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Keep products that already belong to order history.
     */
    const historicalOrderItems = await prisma.orderItem.count({
      where: {
        variant: {
          productId: id,
        },
      },
    });

    if (historicalOrderItems > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: {
            id,
          },
          data: {
            isActive: false,
          },
        });

        await tx.productVariant.updateMany({
          where: {
            productId: id,
          },
          data: {
            isActive: false,
          },
        });
      });

      return NextResponse.json({
        success: true,
        action: "deactivated",
        message: `${product.name} has previous orders, so it was deactivated instead of permanently deleted.`,
      });
    }

    /*
     * Product has no historical order items:
     * hard delete database records.
     */
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({
        where: {
          variant: {
            productId: id,
          },
        },
      });

      await tx.productImage.deleteMany({
        where: {
          productId: id,
        },
      });

      await tx.productVariant.deleteMany({
        where: {
          productId: id,
        },
      });

      await tx.product.delete({
        where: {
          id,
        },
      });
    });

    /*
     * Only after DB succeeds, remove Cloudinary assets.
     */
    const publicIds = [
      ...product.images
        .map((image) => image.publicId)
        .filter((value): value is string => Boolean(value)),

      ...product.variants
        .map((variant) => variant.imagePublicId)
        .filter((value): value is string => Boolean(value)),
    ];

    if (publicIds.length > 0) {
      await cleanupCloudinaryImages(publicIds);
    }

    return NextResponse.json({
      success: true,
      action: "deleted",
      message: `${product.name} deleted successfully.`,
    });
  } catch (error) {
    console.error("Admin delete product error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while deleting the product.",
      },
      {
        status: 500,
      },
    );
  }
}
