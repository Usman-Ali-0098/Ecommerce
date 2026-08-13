import { NextResponse } from "next/server";

import bcrypt from "bcrypt";

import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,

          message: "Email and password are required.",
        },
        {
          status: 400,
        },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },

      select: {
        id: true,

        email: true,

        password: true,

        role: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        {
          success: false,

          message: "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,

          message: "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json({
      success: true,

      role: user.role,
    });
  } catch (error) {
    console.error("Login role check error:", error);

    return NextResponse.json(
      {
        success: false,

        message: "Something went wrong.",
      },
      {
        status: 500,
      },
    );
  }
}
