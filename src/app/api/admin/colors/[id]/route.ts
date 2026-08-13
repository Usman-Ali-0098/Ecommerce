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

    const existingColor = await prisma.color.findUnique({
      where: {
        id,
      },
    });

    if (!existingColor) {
      return NextResponse.json(
        {
          success: false,
          message: "Color not found.",
        },
        {
          status: 404,
        },
      );
    }

    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";

    const hexacode =
      typeof body?.hexacode === "string" ? body.hexacode.trim() : "";

    const isActive =
      typeof body?.isActive === "boolean"
        ? body.isActive
        : existingColor.isActive;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Color name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (hexacode && !/^#[0-9A-Fa-f]{6}$/.test(hexacode)) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid hex color.",
        },
        {
          status: 400,
        },
      );
    }

    const duplicate = await prisma.color.findFirst({
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
          message: "Another color with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    const color = await prisma.color.update({
      where: {
        id,
      },

      data: {
        name,
        hexacode: hexacode || null,
        isActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Color updated successfully.",
      data: color,
    });
  } catch (error) {
    console.error("Update color error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update color.",
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

    const color = await prisma.color.findUnique({
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

    if (!color) {
      return NextResponse.json(
        {
          success: false,
          message: "Color not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * If already used by variants,
     * deactivate instead of deleting.
     */
    if (color._count.variants > 0) {
      const updatedColor = await prisma.color.update({
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
          "Color is already used by products, so it was deactivated instead of deleted.",
        data: updatedColor,
      });
    }

    await prisma.color.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Color deleted successfully.",
    });
  } catch (error) {
    console.error("Delete color error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete color.",
      },
      {
        status: 500,
      },
    );
  }
}
