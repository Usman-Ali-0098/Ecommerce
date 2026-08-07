import { createHash } from "node:crypto";

import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    // 1. Read the data sent by the reset-password page
    const body: unknown = await request.json();

    // 2. Validate token, password, and confirmPassword
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    // 3. Hash the raw token received from the URL
    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    // 4. Find the corresponding reset-token record
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        expiresAt: true,
        usedAt: true,
        userId: true,
      },
    });

    // 5. Reject an unknown token
    if (!resetToken) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This password reset link is invalid. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // 6. Reject a link that was already used
    if (resetToken.usedAt) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This password reset link has already been used. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // 7. Reject an expired link
    if (resetToken.expiresAt <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This password reset link has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // 8. Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 9. Update password and consume the token together
    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          password: hashedPassword,
        },
      }),

      prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    // 10. Return success without exposing sensitive information
    return NextResponse.json({
      success: true,
      message:
        "Your password has been reset successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to reset the password. Please try again.",
      },
      { status: 500 }
    );
  }
}