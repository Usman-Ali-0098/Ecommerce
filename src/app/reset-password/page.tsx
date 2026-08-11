import { createHash } from "node:crypto";

import Link from "next/link";

import AuthCard from "@/components/auth/auth-card";
import AuthLayout from "@/components/auth/auth-layout";
import ResetPasswordForm from "@/components/auth/reset-password-form";

import prisma from "@/lib/prisma";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } =
    await searchParams;

  if (!token) {
    return (
      <InvalidResetLink message="This password reset link is invalid." />
    );
  }

  const tokenHash =
    createHash("sha256")
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
      <InvalidResetLink message="This password reset link is invalid." />
    );
  }

  if (resetToken.usedAt) {
    return (
      <InvalidResetLink message="This password reset link has already been used." />
    );
  }

  if (
    resetToken.expiresAt <=
    new Date()
  ) {
    return (
      <InvalidResetLink message="This password reset link has expired." />
    );
  }

  return (
    <AuthLayout
      title="Reset Password"
      description="Create a new password for your account."
      width="sm"
    >
      <AuthCard>
        <ResetPasswordForm
          token={token}
        />
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
    <AuthLayout
      title="Reset Password"
      description="This reset link can no longer be used."
      width="sm"
    >
      <AuthCard>
        <div className="space-y-4 text-center">
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
          >
            {message}
          </div>

          <p className="text-xs leading-5 text-gray-500">
            Please request a new password reset link to continue.
          </p>

          <Link
            href="/forgot-password"
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[#087ff5] bg-[#087ff5] px-4 text-sm font-medium text-white transition hover:bg-[#066ed6]"
          >
            Request New Reset Link
          </Link>

          <Link
            href="/login"
            className="inline-flex text-xs font-medium text-[#087ff5] transition hover:text-[#066ed6] hover:underline"
          >
            Back to Sign In
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}