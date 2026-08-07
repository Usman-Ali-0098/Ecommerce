"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";

import AuthCard from "@/components/auth/auth-card";
import AuthLayout from "@/components/auth/auth-layout";
import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Input from "@/components/ui/input";
import PasswordInput from "@/components/ui/password-input";
import { useAlert } from "@/hooks/use-alert";
import {
  loginSchema,
  type LoginInput,
} from "@/lib/validations/auth";

type LoginErrors = Partial<
  Record<keyof LoginInput, string>
>;

const initialForm: LoginInput = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const { alert, showAlert, closeAlert } = useAlert();

  const [form, setForm] =
    useState<LoginInput>(initialForm);

  const [errors, setErrors] =
    useState<LoginErrors>({});

  const [rememberMe, setRememberMe] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  function updateField(
    field: keyof LoginInput,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]: undefined,
      }));
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const validationResult =
      loginSchema.safeParse(form);

    if (!validationResult.success) {
      const fieldErrors: LoginErrors = {};

      for (
        const issue of validationResult.error.issues
      ) {
        const field = issue.path[0];

        if (
          typeof field === "string" &&
          !fieldErrors[field as keyof LoginInput]
        ) {
          fieldErrors[field as keyof LoginInput] =
            issue.message;
        }
      }

      setErrors(fieldErrors);

      showAlert("Please correct the form errors.", {
        variant: "error",
      });

      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const validatedData =
        validationResult.data;

      const result = await signIn("credentials", {
        email: validatedData.email,
        password: validatedData.password,
        redirect: false,
      });

      if (!result || result.error) {
        showAlert("Invalid email or password.", {
          variant: "error",
        });

        return;
      }

      showAlert("Login successful.", {
        variant: "success",
        duration: 1500,
      });

      window.setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 700);
    } catch (error) {
      console.error("Login error:", error);

      showAlert(
        "Unable to log in right now. Please try again.",
        {
          variant: "error",
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Login">
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
            label="Enter email address"
            placeholder="Please enter your email"
            value={form.email}
            error={errors.email}
            disabled={isSubmitting}
            onChange={(event) =>
              updateField(
                "email",
                event.target.value
              )
            }
          />

          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            label="Password"
            placeholder="Please enter password"
            value={form.password}
            error={errors.password}
            disabled={isSubmitting}
            onChange={(event) =>
              updateField(
                "password",
                event.target.value
              )
            }
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Checkbox
              id="rememberMe"
              name="rememberMe"
              label="Remember me"
              checked={rememberMe}
              disabled={isSubmitting}
              onChange={(event) =>
                setRememberMe(
                  event.target.checked
                )
              }
            />

            <Link
              href="/forgot-password"
              className="text-sm text-[#087ff5] hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <Button
            type="submit"
            fullWidth
            loading={isSubmitting}
          >
            Login
          </Button>

          <p className="text-center text-sm text-[#6c757d]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-[#087ff5] hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}