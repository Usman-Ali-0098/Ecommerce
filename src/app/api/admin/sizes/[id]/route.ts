import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await params;

    const existingSize = await prisma.size.findUnique({
      where: {
        id,
      },
    });

    if (!existingSize) {
      return NextResponse.json(
        {
          success: false,
          message: "Size not found.",
        },
        {
          status: 404,
        },
      );
    }

    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";

    const sortOrder = Number(body?.sortOrder);

    const isActive =
      typeof body?.isActive === "boolean"
        ? body.isActive
        : existingSize.isActive;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Size name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Sort order must be a whole number of 0 or greater.",
        },
        {
          status: 400,
        },
      );
    }

    const duplicate = await prisma.size.findFirst({
      where: {
        id: {
          not: id,
        },

        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "Another size with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    const size = await prisma.size.update({
      where: {
        id,
      },

      data: {
        name,
        sortOrder,
        isActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Size updated successfully.",
      data: size,
    });
  } catch (error) {
    console.error("Update size error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update size.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await params;

    const size = await prisma.size.findUnique({
      where: {
        id,
      },

      include: {
        _count: {
          select: {
            variants: true,
          },
        },
      },
    });

    if (!size) {
      return NextResponse.json(
        {
          success: false,
          message: "Size not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Do not physically delete
     * something already referenced
     * by products.
     */
    if (size._count.variants > 0) {
      const updatedSize = await prisma.size.update({
        where: {
          id,
        },

        data: {
          isActive: false,
        },
      });

      return NextResponse.json({
        success: true,
        message:
          "Size is already used by products, so it was deactivated instead of deleted.",
        data: updatedSize,
      });
    }

    await prisma.size.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Size deleted successfully.",
    });
  } catch (error) {
    console.error("Delete size error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete size.",
      },
      {
        status: 500,
      },
    );
  }
}
