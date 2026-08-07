"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import AuthCard from "@/components/auth/auth-card";
import AuthLayout from "@/components/auth/auth-layout";
import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useAlert } from "@/hooks/use-alert";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";

type ForgotPasswordErrors = Partial<
  Record<keyof ForgotPasswordInput, string>
>;

type ForgotPasswordApiResponse = {
  success: boolean;
  message: string;
  errors?: Partial<
    Record<keyof ForgotPasswordInput, string[]>
  >;
};

const initialForm: ForgotPasswordInput = {
  email: "",
};

export default function ForgotPasswordPage() {
  const { alert, showAlert, closeAlert } = useAlert();

  const [form, setForm] =
    useState<ForgotPasswordInput>(initialForm);

  const [errors, setErrors] =
    useState<ForgotPasswordErrors>({});

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  function updateEmail(value: string) {
    setForm({
      email: value,
    });

    if (errors.email) {
      setErrors({});
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const validationResult =
      forgotPasswordSchema.safeParse(form);

    if (!validationResult.success) {
      const emailIssue =
        validationResult.error.issues.find(
          (issue) => issue.path[0] === "email"
        );

      setErrors({
        email: emailIssue?.message,
      });

      showAlert("Please enter a valid email address.", {
        variant: "error",
      });

      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validationResult.data),
        }
      );

      const data =
        (await response.json()) as ForgotPasswordApiResponse;

      if (!response.ok || !data.success) {
        if (data.errors?.email?.[0]) {
          setErrors({
            email: data.errors.email[0],
          });
        }

        showAlert(
          data.message ||
            "Unable to process the password reset request.",
          {
            variant: "error",
          }
        );

        return;
      }

      setForm(initialForm);

      showAlert(data.message, {
        variant: "success",
        duration: 7000,
      });
    } catch (error) {
      console.error("Forgot password error:", error);

      showAlert(
        "Unable to process the request right now. Please try again.",
        {
          variant: "error",
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Forgot Password">
      {alert ? (
        <Alert
          message={alert.message}
          variant={alert.variant}
          onClose={closeAlert}
        />
      ) : null}

      <AuthCard>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-6"
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            label="Email"
            placeholder="Please enter your email"
            value={form.email}
            error={errors.email}
            disabled={isSubmitting}
            onChange={(event) =>
              updateEmail(event.target.value)
            }
          />

          <Button
            type="submit"
            fullWidth
            loading={isSubmitting}
          >
            Forgot Password
          </Button>

          <p className="text-center text-sm text-[#6c757d]">
            Remember your password?{" "}
            <Link
              href="/login"
              className="text-[#087ff5] hover:underline"
            >
              Login
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}