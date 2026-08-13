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

    const sizes = await prisma.size.findMany({
      orderBy: [
        {
          sortOrder: "asc",
        },

        {
          name: "asc",
        },
      ],
    });

    return NextResponse.json(
      {
        success: true,
        data: sizes,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Get sizes error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch sizes.",
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

    const sortOrder = Number(body?.sortOrder);

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

    const existingSize = await prisma.size.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existingSize) {
      return NextResponse.json(
        {
          success: false,
          message: "A size with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    const size = await prisma.size.create({
      data: {
        name,
        sortOrder,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Size added successfully.",
        data: size,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Create size error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create size.",
      },
      {
        status: 500,
      },
    );
  }
}
