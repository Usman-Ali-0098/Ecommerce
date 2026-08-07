import { createHash } from "node:crypto";

import Link from "next/link";

import AuthCard from "@/components/auth/auth-card";
import AuthLayout from "@/components/auth/auth-layout";
import ResetPasswordForm from "@/components/auth/reset-password-form";
import Button from "@/components/ui/button";
import prisma from "@/lib/prisma";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <InvalidResetLink
        message="This password reset link is invalid."
      />
    );
  }

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  const resetToken =
    await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        expiresAt: true,
        usedAt: true,
      },
    });

  if (!resetToken) {
    return (
      <InvalidResetLink
        message="This password reset link is invalid."
      />
    );
  }

  if (resetToken.usedAt) {
    return (
      <InvalidResetLink
        message="This password reset link has already been used."
      />
    );
  }

  if (resetToken.expiresAt <= new Date()) {
    return (
      <InvalidResetLink
        message="This password reset link has expired."
      />
    );
  }

  return (
    <AuthLayout title="Reset Password">
      <AuthCard>
        <ResetPasswordForm token={token} />
      </AuthCard>
    </AuthLayout>
  );
}

function InvalidResetLink({
  message,
}: {
  message: string;
}) {
  return (
    <AuthLayout title="Reset Password">
      <AuthCard>
        <div className="space-y-6 text-center">
          <div
            role="alert"
            className="rounded border border-[#f5c2c7] bg-[#f8d7da] px-5 py-4 text-sm text-[#842029]"
          >
            {message}
          </div>

          <p className="text-sm leading-6 text-[#6c757d]">
            Please request a new password reset email to
            continue.
          </p>

          <Button fullWidth>
            <Link
              href="/forgot-password"
              className="flex h-full w-full items-center justify-center"
            >
              Request New Reset Link
            </Link>
          </Button>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}