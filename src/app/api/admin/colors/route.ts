import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

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

    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";

    const hexacode =
      typeof body?.hexacode === "string" ? body.hexacode.trim() : "";

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
          message: "Enter a valid hex color, for example #000000.",
        },
        {
          status: 400,
        },
      );
    }

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
