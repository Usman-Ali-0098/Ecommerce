import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/validate-request";
import { createColorSchema } from "@/lib/validations/admin";

export async function GET() {
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

    const colors = await prisma.color.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: colors,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Get colors error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch colors.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
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

    const validation = validateRequest(createColorSchema, await request.json());

    if (!validation.success) {
      return validation.response;
    }

    const { name, hexacode } = validation.data;

    const existingColor = await prisma.color.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existingColor) {
      return NextResponse.json(
        {
          success: false,
          message: "A color with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    const color = await prisma.color.create({
      data: {
        name,
        hexacode: hexacode || null,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Color added successfully.",
        data: color,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Create color error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create color.",
      },
      {
        status: 500,
      },
    );
  }
}
