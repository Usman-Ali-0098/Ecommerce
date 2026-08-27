import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/validate-request";
import { adminIdParamsSchema } from "@/lib/validations/admin";
import { updateAdminProductSchema } from "@/lib/validations/admin-product";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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

export async function PUT(request: Request, { params }: RouteContext) {
  let newlyUploadedPublicIds: string[] = [];

  try {
    const admin = await getAdminSession();

    if (!admin) {
      throw new RouteError("Admin authentication required.", 401);
    }

    const paramsValidation = validateRequest(adminIdParamsSchema, await params);

    if (!paramsValidation.success) {
      return paramsValidation.response;
    }

    const { id } = paramsValidation.data;

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

    const bodyValidation = validateRequest(
      updateAdminProductSchema,
      await request.json(),
    );

    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    const { name, description, categoryId, isActive, images, variants } =
      bodyValidation.data;

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
     * Newly-uploaded base product images.
     */
    newlyUploadedPublicIds = images
      .filter((image) => image.source === "new")
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
        [...variants.map((variant) => variant.colorId), ...images.map((image) => image.colorId)]
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
      .filter((image) => image.source === "existing")
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
        (variant): variant is typeof variant & { id: string } =>
          Boolean(variant.id),
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
              colorId: image.colorId,
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
              colorId: image.colorId,
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

    const validation = validateRequest(adminIdParamsSchema, await params);

    if (!validation.success) {
      return validation.response;
    }

    const { id } = validation.data;

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
