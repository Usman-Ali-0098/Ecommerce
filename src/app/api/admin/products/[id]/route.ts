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
};

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getUniqueSlug(
  name: string,
  productId: string
) {
  const baseSlug =
    createSlug(name) || "product";

  const existing =
    await prisma.product.findFirst({
      where: {
        slug: baseSlug,
        NOT: {
          id: productId,
        },
      },
      select: {
        id: true,
      },
    });

  if (!existing) {
    return baseSlug;
  }

  let counter = 2;

  while (true) {
    const candidate =
      `${baseSlug}-${counter}`;

    const exists =
      await prisma.product.findFirst({
        where: {
          slug: candidate,
          NOT: {
            id: productId,
          },
        },
        select: {
          id: true,
        },
      });

    if (!exists) {
      return candidate;
    }

    counter++;
  }
}

/*
 * =====================================
 * UPDATE PRODUCT
 * PUT /api/admin/products/[id]
 * =====================================
 */

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  try {
    const admin =
      await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } =
      await params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const existingProduct =
      await prisma.product.findUnique({
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
            select: {
              id: true,
              sku: true,
            },
          },
        },
      });

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product not found.",
        },
        {
          status: 404,
        }
      );
    }

    const body =
      await request.json();

    const name =
      typeof body?.name ===
      "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body?.description ===
      "string"
        ? body.description.trim()
        : "";

    const categoryId =
      typeof body?.categoryId ===
      "string"
        ? body.categoryId.trim()
        : "";

    const imageUrl =
      typeof body?.imageUrl ===
        "string" &&
      body.imageUrl.trim()
        ? body.imageUrl.trim()
        : null;

    const imagePublicId =
      typeof body?.imagePublicId ===
        "string" &&
      body.imagePublicId.trim()
        ? body.imagePublicId.trim()
        : null;

    const isActive =
      body?.isActive !== false;

    const rawVariants =
      Array.isArray(
        body?.variants
      )
        ? body.variants
        : [];

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      rawVariants.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "At least one variant is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      (imageUrl &&
        !imagePublicId) ||
      (!imageUrl &&
        imagePublicId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid image information.",
        },
        {
          status: 400,
        }
      );
    }

    const category =
      await prisma.category.findUnique({
        where: {
          id: categoryId,
        },

        select: {
          id: true,
        },
      });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected category does not exist.",
        },
        {
          status: 400,
        }
      );
    }

    const variants:
      VariantInput[] = [];

    for (
      const rawVariant
      of rawVariants
    ) {
      const variantId =
        typeof rawVariant?.id ===
        "string"
          ? rawVariant.id.trim()
          : undefined;

      const sku =
        typeof rawVariant?.sku ===
        "string"
          ? rawVariant.sku
              .trim()
              .toUpperCase()
          : "";

      const price =
        Number(
          rawVariant?.price
        );

      const stock =
        Number(
          rawVariant?.stock
        );

      const colorId =
        typeof rawVariant
          ?.colorId ===
          "string" &&
        rawVariant.colorId.trim()
          ? rawVariant.colorId.trim()
          : null;

      const sizeId =
        typeof rawVariant
          ?.sizeId ===
          "string" &&
        rawVariant.sizeId.trim()
          ? rawVariant.sizeId.trim()
          : null;

      if (!sku) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Every variant requires an SKU.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isFinite(
          price
        ) ||
        price < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Invalid price for ${sku}.`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isInteger(
          stock
        ) ||
        stock < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Invalid stock for ${sku}.`,
          },
          {
            status: 400,
          }
        );
      }

      variants.push({
        id: variantId,
        sku,
        price,
        stock,
        colorId,
        sizeId,
      });
    }

    /*
     * Duplicate SKUs in request.
     */
    const skuKeys =
      variants.map(
        (variant) =>
          variant.sku
            .toLowerCase()
      );

    if (
      new Set(skuKeys).size !==
      skuKeys.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Every variant must have a unique SKU.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Duplicate color/size
     * combinations.
     */
    const combinationKeys =
      variants.map(
        (variant) =>
          `${variant.colorId ?? "null"}:${variant.sizeId ?? "null"}`
      );

    if (
      new Set(
        combinationKeys
      ).size !==
      combinationKeys.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Duplicate variant combination detected.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Validate colors.
     */
    const colorIds = [
      ...new Set(
        variants
          .map(
            (variant) =>
              variant.colorId
          )
          .filter(
            (
              value
            ): value is string =>
              value !== null
          )
      ),
    ];

    if (
      colorIds.length > 0
    ) {
      const count =
        await prisma.color.count({
          where: {
            id: {
              in: colorIds,
            },
          },
        });

      if (
        count !==
        colorIds.length
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One or more colors are invalid.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * Validate sizes.
     */
    const sizeIds = [
      ...new Set(
        variants
          .map(
            (variant) =>
              variant.sizeId
          )
          .filter(
            (
              value
            ): value is string =>
              value !== null
          )
      ),
    ];

    if (
      sizeIds.length > 0
    ) {
      const count =
        await prisma.size.count({
          where: {
            id: {
              in: sizeIds,
            },
          },
        });

      if (
        count !==
        sizeIds.length
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One or more sizes are invalid.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * Validate existing variant IDs.
     *
     * A client must not send an ID
     * belonging to another product.
     */
    const existingVariantIds =
      new Set(
        existingProduct.variants.map(
          (variant) =>
            variant.id
        )
      );

    for (const variant of variants) {
      if (
        variant.id &&
        !existingVariantIds.has(
          variant.id
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid product variant.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * Check SKUs against variants
     * belonging to OTHER products.
     */
    const duplicateSku =
      await prisma.productVariant.findFirst({
        where: {
          sku: {
            in: variants.map(
              (variant) =>
                variant.sku
            ),
          },

          productId: {
            not: id,
          },
        },

        select: {
          sku: true,
        },
      });

    if (duplicateSku) {
      return NextResponse.json(
        {
          success: false,
          message:
            `SKU ${duplicateSku.sku} is already in use.`,
        },
        {
          status: 409,
        }
      );
    }

    const slug =
      await getUniqueSlug(
        name,
        id
      );

    const submittedExistingIds =
      variants
        .filter(
          (
            variant
          ): variant is VariantInput & {
            id: string;
          } =>
            Boolean(
              variant.id
            )
        )
        .map(
          (variant) =>
            variant.id
        );

    const removedVariantIds =
      existingProduct.variants
        .map(
          (variant) =>
            variant.id
        )
        .filter(
          (variantId) =>
            !submittedExistingIds.includes(
              variantId
            )
        );

    /*
     * Remember old image so we
     * can remove it from Cloudinary
     * AFTER DB update succeeds.
     */
    const oldPrimaryImage =
      existingProduct.images.find(
        (image) =>
          image.isPrimary
      ) ??
      existingProduct.images[0] ??
      null;

    const oldPublicId =
      oldPrimaryImage?.publicId ??
      null;

    const imageChanged =
      oldPublicId !==
      imagePublicId;

    /*
     * =================================
     * DATABASE TRANSACTION
     * =================================
     */
    await prisma.$transaction(
      async (tx) => {
        await tx.product.update({
          where: {
            id,
          },

          data: {
            name,
            slug,
            description:
              description || null,
            categoryId,
            isActive,
          },
        });

        /*
         * Remove variants deleted
         * by admin.
         *
         * Cart items referencing them
         * are removed first.
         */
        if (
          removedVariantIds.length >
          0
        ) {
          await tx.cartItem.deleteMany({
            where: {
              variantId: {
                in:
                  removedVariantIds,
              },
            },
          });

          await tx.productVariant.deleteMany({
            where: {
              id: {
                in:
                  removedVariantIds,
              },

              productId: id,
            },
          });
        }

        /*
         * Update or create variants.
         */
        for (
          const variant
          of variants
        ) {
          if (variant.id) {
            await tx.productVariant.update({
              where: {
                id:
                  variant.id,
              },

              data: {
                sku:
                  variant.sku,

                price:
                  variant.price,

                stock:
                  variant.stock,

                colorId:
                  variant.colorId,

                sizeId:
                  variant.sizeId,

                isActive,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: id,

                sku:
                  variant.sku,

                price:
                  variant.price,

                stock:
                  variant.stock,

                colorId:
                  variant.colorId,

                sizeId:
                  variant.sizeId,

                isActive,
              },
            });
          }
        }

        /*
         * Replace product image
         * metadata.
         */
        if (imageChanged) {
          await tx.productImage.deleteMany({
            where: {
              productId: id,
            },
          });

          if (
            imageUrl &&
            imagePublicId
          ) {
            await tx.productImage.create({
              data: {
                productId: id,
                url:
                  imageUrl,
                publicId:
                  imagePublicId,
                altText:
                  name,
                isPrimary:
                  true,
                position: 0,
              },
            });
          }
        } else {
          /*
           * Keep image but update alt text.
           */
          await tx.productImage.updateMany({
            where: {
              productId: id,
            },

            data: {
              altText:
                name,
            },
          });
        }
      }
    );

    /*
     * =================================
     * CLOUDINARY CLEANUP
     * =================================
     *
     * DB update already succeeded.
     * Now remove replaced old image.
     */
    if (
      imageChanged &&
      oldPublicId &&
      oldPublicId !==
        imagePublicId
    ) {
      try {
        await cloudinary.uploader.destroy(
          oldPublicId,
          {
            resource_type:
              "image",
            invalidate: true,
          }
        );
      } catch (error) {
        /*
         * Product update should stay
         * successful even if CDN cleanup
         * fails temporarily.
         */
        console.error(
          "Old Cloudinary image cleanup failed:",
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Product updated successfully.",
    });
  } catch (error) {
    console.error(
      "Admin update product error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while updating the product.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =====================================
 * DELETE PRODUCT
 * =====================================
 */

export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    /*
     * Admin protection.
     *
     * Customer Auth.js login does
     * not give access here.
     */
    const admin =
      await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } =
      await params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Make sure product exists.
     *
     * Also load Cloudinary IDs
     * in case hard delete occurs.
     */
    const product =
      await prisma.product.findUnique({
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
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Check whether any variant
     * exists in historical OrderItems.
     */
    const historicalOrderItems =
      await prisma.orderItem.count({
        where: {
          variant: {
            productId: id,
          },
        },
      });

    /*
     * CASE 1:
     * Product has previous orders.
     *
     * Keep database/history and
     * Cloudinary image.
     */
    if (
      historicalOrderItems > 0
    ) {
      await prisma.$transaction(
        async (tx) => {
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
        }
      );

      return NextResponse.json({
        success: true,

        action:
          "deactivated",

        message:
          `${product.name} has previous orders, so it was deactivated instead of permanently deleted.`,
      });
    }

    /*
     * CASE 2:
     * Never ordered.
     *
     * Hard delete DB data.
     */
    await prisma.$transaction(
      async (tx) => {
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
      }
    );

    /*
     * Delete actual Cloudinary
     * images after DB succeeds.
     */
    for (
      const image
      of product.images
    ) {
      if (!image.publicId) {
        continue;
      }

      try {
        await cloudinary.uploader.destroy(
          image.publicId,
          {
            resource_type:
              "image",
            invalidate: true,
          }
        );
      } catch (error) {
        console.error(
          `Cloudinary cleanup failed for ${image.publicId}:`,
          error
        );
      }
    }

    return NextResponse.json({
      success: true,

      action: "deleted",

      message:
        `${product.name} deleted successfully.`,
    });
  } catch (error) {
    console.error(
      "Admin delete product error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while deleting the product.",
      },
      {
        status: 500,
      }
    );
  }
}