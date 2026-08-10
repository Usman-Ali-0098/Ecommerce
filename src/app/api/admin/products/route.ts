import {
  NextResponse,
} from "next/server";

import {
  getAdminSession,
} from "@/lib/admin-auth";

import {
  prisma,
} from "@/lib/prisma";

type VariantInput = {
  sku: string;
  price: number;
  stock: number;
  colorId: string | null;
  sizeId: string | null;
};

function createSlug(
  value: string
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

async function getUniqueSlug(
  name: string
) {
  const baseSlug =
    createSlug(name) ||
    "product";

  const existing =
    await prisma.product
      .findUnique({
        where: {
          slug: baseSlug,
        },

        select: {
          id: true,
        },
      });

  if (!existing) {
    return baseSlug;
  }

  /*
   * Keep checking until
   * a unique slug is found.
   */
  let counter = 2;

  while (true) {
    const candidate =
      `${baseSlug}-${counter}`;

    const exists =
      await prisma.product
        .findUnique({
          where: {
            slug:
              candidate,
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

export async function POST(
  request: Request
) {
  try {
    /*
     * -------------------------
     * ADMIN AUTH
     * -------------------------
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

    /*
     * -------------------------
     * BODY
     * -------------------------
     */

    const body =
      await request.json();

    const name =
      typeof body?.name ===
      "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body
        ?.description ===
      "string"
        ? body.description
            .trim()
        : "";

    const categoryId =
      typeof body
        ?.categoryId ===
      "string"
        ? body.categoryId
            .trim()
        : "";

    const imageUrl =
      typeof body
        ?.imageUrl ===
        "string" &&
      body.imageUrl.trim()
        ? body.imageUrl
            .trim()
        : null;

    const imagePublicId =
      typeof body
        ?.imagePublicId ===
        "string" &&
      body.imagePublicId
        .trim()
        ? body.imagePublicId
            .trim()
        : null;

    const isActive =
      body?.isActive !==
      false;

    const variants =
      Array.isArray(
        body?.variants
      )
        ? body.variants
        : [];

    /*
     * -------------------------
     * BASIC VALIDATION
     * -------------------------
     */

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
            "Valid category is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      variants.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "At least one product variant is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * URL and publicId should
     * arrive together.
     */
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
            "Invalid product image information.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * -------------------------
     * CATEGORY
     * -------------------------
     */

    const category =
      await prisma.category
        .findUnique({
          where: {
            id:
              categoryId,
          },

          select: {
            id: true,
            isActive: true,
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

    /*
     * -------------------------
     * VARIANT VALIDATION
     * -------------------------
     */

    const normalizedVariants:
      VariantInput[] = [];

    for (
      const rawVariant
      of variants
    ) {
      const sku =
        typeof rawVariant
          ?.sku ===
        "string"
          ? rawVariant.sku
              .trim()
              .toUpperCase()
          : "";

      const price =
        Number(
          rawVariant
            ?.price
        );

      const stock =
        Number(
          rawVariant
            ?.stock
        );

      const colorId =
        typeof rawVariant
          ?.colorId ===
          "string" &&
        rawVariant.colorId
          .trim()
          ? rawVariant
              .colorId
              .trim()
          : null;

      const sizeId =
        typeof rawVariant
          ?.sizeId ===
          "string" &&
        rawVariant.sizeId
          .trim()
          ? rawVariant
              .sizeId
              .trim()
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

      normalizedVariants.push(
        {
          sku,
          price,
          stock,
          colorId,
          sizeId,
        }
      );
    }

    /*
     * -------------------------
     * DUPLICATE REQUEST SKUs
     * -------------------------
     */

    const requestSkus =
      normalizedVariants.map(
        (variant) =>
          variant.sku
            .toLowerCase()
      );

    if (
      new Set(
        requestSkus
      ).size !==
      requestSkus.length
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
     * -------------------------
     * DATABASE SKU CHECK
     * -------------------------
     */

    const existingSku =
      await prisma
        .productVariant
        .findFirst({
          where: {
            sku: {
              in:
                normalizedVariants
                  .map(
                    (
                      variant
                    ) =>
                      variant.sku
                  ),
            },
          },

          select: {
            sku: true,
          },
        });

    if (existingSku) {
      return NextResponse.json(
        {
          success: false,

          message:
            `SKU ${existingSku.sku} already exists.`,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * -------------------------
     * COLOR VALIDATION
     * -------------------------
     */

    const colorIds = [
      ...new Set(
        normalizedVariants
          .map(
            (variant) =>
              variant.colorId
          )
          .filter(
            (
              id
            ): id is string =>
              id !== null
          )
      ),
    ];

    if (
      colorIds.length >
      0
    ) {
      const colorCount =
        await prisma.color
          .count({
            where: {
              id: {
                in:
                  colorIds,
              },
            },
          });

      if (
        colorCount !==
        colorIds.length
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One or more selected colors are invalid.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * -------------------------
     * SIZE VALIDATION
     * -------------------------
     */

    const sizeIds = [
      ...new Set(
        normalizedVariants
          .map(
            (variant) =>
              variant.sizeId
          )
          .filter(
            (
              id
            ): id is string =>
              id !== null
          )
      ),
    ];

    if (
      sizeIds.length >
      0
    ) {
      const sizeCount =
        await prisma.size
          .count({
            where: {
              id: {
                in:
                  sizeIds,
              },
            },
          });

      if (
        sizeCount !==
        sizeIds.length
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One or more selected sizes are invalid.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * -------------------------
     * DUPLICATE COMBINATIONS
     * -------------------------
     */

    const combinationKeys =
      normalizedVariants.map(
        (variant) =>
          `${
            variant.colorId ??
            "null"
          }:${
            variant.sizeId ??
            "null"
          }`
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
            "Duplicate product variant combination detected.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * -------------------------
     * SLUG
     * -------------------------
     */

    const slug =
      await getUniqueSlug(
        name
      );

    /*
     * -------------------------
     * CREATE PRODUCT
     * -------------------------
     */

    const product =
      await prisma
        .$transaction(
          async (tx) => {
            const newProduct =
              await tx.product
                .create({
                  data: {
                    name,
                    slug,

                    description:
                      description ||
                      null,

                    categoryId,

                    isActive,
                  },
                });

            /*
             * Cloudinary image
             * metadata goes in DB.
             *
             * Actual file remains
             * in Cloudinary.
             */
            if (
              imageUrl &&
              imagePublicId
            ) {
              await tx
                .productImage
                .create({
                  data: {
                    productId:
                      newProduct
                        .id,

                    url:
                      imageUrl,

                    publicId:
                      imagePublicId,

                    altText:
                      name,

                    isPrimary:
                      true,

                    position:
                      0,
                  },
                });
            }

            /*
             * Variants
             */
            await tx
              .productVariant
              .createMany({
                data:
                  normalizedVariants
                    .map(
                      (
                        variant
                      ) => ({
                        productId:
                          newProduct
                            .id,

                        sku:
                          variant
                            .sku,

                        price:
                          variant
                            .price,

                        stock:
                          variant
                            .stock,

                        colorId:
                          variant
                            .colorId,

                        sizeId:
                          variant
                            .sizeId,

                        isActive:
                          true,
                      })
                    ),
              });

            return newProduct;
          }
        );

    return NextResponse.json(
      {
        success: true,

        message:
          "Product created successfully.",

        data: {
          id:
            product.id,

          name:
            product.name,

          slug:
            product.slug,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Admin create product error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Something went wrong while creating the product.",
      },
      {
        status: 500,
      }
    );
  }
}