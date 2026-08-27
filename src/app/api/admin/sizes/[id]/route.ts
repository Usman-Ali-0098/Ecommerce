import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/validate-request";
import {
  adminIdParamsSchema,
  updateSizeSchema,
} from "@/lib/validations/admin";

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

    const paramsValidation = validateRequest(adminIdParamsSchema, await params);

    if (!paramsValidation.success) {
      return paramsValidation.response;
    }

    const { id } = paramsValidation.data;

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

    const bodyValidation = validateRequest(
      updateSizeSchema,
      await request.json(),
    );

    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    const { name, sortOrder } = bodyValidation.data;
    const isActive = bodyValidation.data.isActive ?? existingSize.isActive;

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

    const validation = validateRequest(adminIdParamsSchema, await params);

    if (!validation.success) {
      return validation.response;
    }

    const { id } = validation.data;

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
