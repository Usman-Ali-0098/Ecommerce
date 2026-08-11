import bcrypt from "bcrypt";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  setAdminSession,
} from "@/lib/admin-auth";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const email =
      typeof body?.email ===
      "string"
        ? body.email
            .trim()
            .toLowerCase()
        : "";

    const password =
      typeof body?.password ===
      "string"
        ? body.password
        : "";

    const rememberMe =
      body?.rememberMe ===
      true;

    if (
      !email ||
      !password
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Email and password are required.",
        },
        {
          status:
            400,
        }
      );
    }

    const admin =
      await prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,
          email: true,
          password: true,
          role: true,
          fullName: true,
        },
      });

    /*
     * Never allow a normal
     * customer account here.
     */
    if (
      !admin ||
      admin.role !==
        "ADMIN"
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Invalid admin credentials.",
        },
        {
          status:
            401,
        }
      );
    }

    if (
      !admin.password
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Invalid admin credentials.",
        },
        {
          status:
            401,
        }
      );
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        admin.password
      );

    if (
      !passwordMatches
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Invalid admin credentials.",
        },
        {
          status:
            401,
        }
      );
    }

    await setAdminSession(
      admin.id,
      admin.email,
      rememberMe
    );

    return NextResponse.json({
      success:
        true,

      message:
        "Admin login successful.",

      data: {
        id:
          admin.id,

        email:
          admin.email,

        fullName:
          admin.fullName,
      },
    });
  } catch (error) {
    console.error(
      "Admin login error:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unable to login.",
      },
      {
        status:
          500,
      }
    );
  }
}