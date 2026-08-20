import { createHash, randomBytes } from "node:crypto";
import { createElement } from "react";
import { NextResponse } from "next/server";

import PasswordResetEmail from "@/emails/password-reset-email";
import prisma from "@/lib/prisma";
import resend from "@/lib/resend";
import { forgotPasswordSchema } from "@/lib/validations/auth";

const GENERIC_RESPONSE =
  "If an account exists for this email, a password reset link has been sent.";

export async function POST(request: Request) {
  try {
    // 1. Read the request body
    const body: unknown = await request.json();

    // 2. Validate the email
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email } = result.data;

    // 3. Find the user privately
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    // 4. Always return the same public response
    if (!user) {
      return NextResponse.json({
        success: true,
        message: GENERIC_RESPONSE,
      });
    }

    // 5. Check email configuration
    const appUrl = process.env.APP_URL;
    const emailFrom = process.env.EMAIL_FROM;

    if (!appUrl || !emailFrom) {
      throw new Error("APP_URL or EMAIL_FROM is not configured");
    }

    // 6. Generate the raw token for the email link
    const rawToken = randomBytes(32).toString("hex");

    // 7. Hash the token before storing it
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    // 8. Make the token expire after one minute
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    // 9. Remove previous unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    // 10. Save the new token hash
    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        expiresAt,
        userId: user.id,
      },
    });

    // 11. Build the real reset-password URL
    const resetUrl = new URL("/reset-password", appUrl);

    resetUrl.searchParams.set("token", rawToken);

    // 12. Send the professional reset email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: emailFrom,
      to: [user.email],
      subject: "Reset your password",
      react: createElement(PasswordResetEmail, {
        fullName: user.fullName,
        resetUrl: resetUrl.toString(),
      }),
    });

    // 13. Remove the token if email delivery was rejected
    if (emailError) {
      console.error("Password reset email error:", emailError);

      await prisma.passwordResetToken.delete({
        where: {
          tokenHash,
        },
      });

      throw new Error("Password reset email could not be sent");
    }

    console.log("Password reset email accepted:", {
      emailId: emailData?.id,
      userId: user.id,
    });

    // 14. Return the safe generic response
    return NextResponse.json({
      success: true,
      message: GENERIC_RESPONSE,
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process the password reset request",
      },
      { status: 500 },
    );
  }
}
