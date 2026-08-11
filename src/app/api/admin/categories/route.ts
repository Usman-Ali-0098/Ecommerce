import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  getAdminSession,
} from "@/lib/admin-auth";

export async function POST(
  request: Request
) {
  try {
    /*
     * Only logged-in admins
     * may create categories.
     */
    const admin =
      await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Unauthorized.",
        },
        {
          status: 401,
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

    if (!name) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Category name is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Category names should not
     * be duplicated only because
     * letter casing is different.
     */
    const existingCategory =
      await prisma.category.findFirst({
        where: {
          name: {
            equals:
              name,

            mode:
              "insensitive",
          },
        },

        select: {
          id: true,
        },
      });

    if (
      existingCategory
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "This category already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const baseSlug =
      createSlug(name);

    if (!baseSlug) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid category name.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Product Category.slug is
     * unique in your Prisma schema.
     *
     * If generated slug already
     * exists, add a numeric suffix.
     */
    let slug =
      baseSlug;

    let suffix =
      1;

    while (
      await prisma.category.findUnique({
        where: {
          slug,
        },

        select: {
          id: true,
        },
      })
    ) {
      slug =
        `${baseSlug}-${suffix}`;

      suffix +=
        1;
    }

    const category =
      await prisma.category.create({
        data: {
          name,
          slug,

          isActive:
            true,
        },

        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      });

    return NextResponse.json(
      {
        success: true,

        message:
          "Category added successfully.",

        data: {
          category,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Create category error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to create category.",
      },
      {
        status: 500,
      }
    );
  }
}

function createSlug(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}