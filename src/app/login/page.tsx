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

import { loginSchema, type LoginInput } from "@/lib/validations/auth";

type LoginErrors = Partial<Record<keyof LoginInput, string>>;

const initialForm: LoginInput = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();

  const { alert, showAlert, closeAlert } = useAlert();

  const [form, setForm] = useState<LoginInput>(initialForm);

  const [errors, setErrors] = useState<LoginErrors>({});

  const [rememberMe, setRememberMe] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  function updateField(field: keyof LoginInput, value: string) {
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

  async function handleGoogleSignIn() {
    try {
      setIsGoogleSubmitting(true);

      await signIn("google", {
        callbackUrl: "/",
      });
    } catch (error) {
      console.error("Google login error:", error);

      setIsGoogleSubmitting(false);

      showAlert("Unable to continue with Google.", {
        variant: "error",
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = loginSchema.safeParse(form);

    if (!validation.success) {
      const nextErrors: LoginErrors = {};

      for (const issue of validation.error.issues) {
        const field = issue.path[0];

        if (field === "email" || field === "password") {
          nextErrors[field] = issue.message;
        }
      }

      setErrors(nextErrors);

      showAlert("Please correct the form errors.", {
        variant: "error",
      });

      return;
    }

    const { email, password } = validation.data;

    try {
      setIsSubmitting(true);

      /*
       * Step 1:
       * Verify credentials and
       * identify account role.
       */
      const roleResponse = await fetch("/api/login-role", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email,
          password,
        }),
      });

      const roleResult = await roleResponse.json();

      if (!roleResponse.ok) {
        showAlert(roleResult.message ?? "Invalid email or password.", {
          variant: "error",
        });

        return;
      }

      /*
       * Step 2:
       * Admin login.
       */
      if (roleResult.role === "ADMIN") {
        const adminResponse = await fetch("/api/admin/login", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email,
            password,
            rememberMe,
          }),
        });

        const adminResult = await adminResponse.json();

        if (!adminResponse.ok) {
          showAlert(adminResult.message ?? "Unable to login as admin.", {
            variant: "error",
          });

          return;
        }

        router.replace("/admin/products");

        router.refresh();

        return;
      }

      /*
       * Step 3:
       * Customer login.
       */
      if (roleResult.role === "USER") {
        const result = await signIn("credentials", {
          email,
          password,

          rememberMe: rememberMe ? "true" : "false",

          redirect: false,
        });

        if (!result || result.error) {
          showAlert("Invalid email or password.", {
            variant: "error",
          });

          return;
        }

        router.replace("/");

        router.refresh();

        return;
      }

      showAlert("This account role is not supported.", {
        variant: "error",
      });
    } catch (error) {
      console.error("Login error:", error);

      showAlert("Something went wrong while logging in.", {
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      description="Sign in to continue to your account."
    >
      {alert ? (
        <Alert
          message={alert.message}
          variant={alert.variant}
          onClose={closeAlert}
        />
      ) : null}

      <AuthCard>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            label="Email Address"
            placeholder="Enter your email"
            value={form.email}
            error={errors.email}
            disabled={isSubmitting || isGoogleSubmitting}
            onChange={(event) => updateField("email", event.target.value)}
          />

          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            label="Password"
            placeholder="Enter your password"
            value={form.password}
            error={errors.password}
            disabled={isSubmitting || isGoogleSubmitting}
            onChange={(event) => updateField("password", event.target.value)}
          />

          <div className="flex items-center justify-between gap-3">
            <Checkbox
              id="rememberMe"
              name="rememberMe"
              label="Remember me"
              checked={rememberMe}
              disabled={isSubmitting || isGoogleSubmitting}
              onChange={(event) => setRememberMe(event.target.checked)}
            />

            <Link
              href="/forgot-password"
              className="shrink-0 text-xs font-medium text-[#087ff5] transition hover:text-[#066ed6] hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <Button
            type="submit"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting || isGoogleSubmitting}
          >
            Sign In
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />

            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Or
            </span>

            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || isGoogleSubmitting}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4 shrink-0"
            >
              <path
                fill="#4285F4"
                d="M21.805 10.023h-9.18v3.955h5.278c-.228 1.272-.924 2.35-1.973 3.074v2.557h3.192c1.87-1.724 2.948-4.268 2.948-7.29 0-.724-.065-1.418-.185-2.086z"
              />

              <path
                fill="#34A853"
                d="M12.625 21.5c2.67 0 4.91-.884 6.547-2.391l-3.192-2.557c-.885.593-2.018.942-3.355.942-2.576 0-4.758-1.741-5.54-4.082H3.785v2.636A9.875 9.875 0 0 0 12.625 21.5z"
              />

              <path
                fill="#FBBC05"
                d="M7.085 13.412a5.93 5.93 0 0 1-.31-1.912c0-.663.114-1.307.31-1.912V6.952H3.785A9.994 9.994 0 0 0 2.75 11.5c0 1.613.386 3.142 1.035 4.548l3.3-2.636z"
              />

              <path
                fill="#EA4335"
                d="M12.625 5.506c1.453 0 2.758.5 3.784 1.48l2.836-2.837C17.53 2.551 15.294 1.5 12.625 1.5a9.875 9.875 0 0 0-8.84 5.452l3.3 2.636c.782-2.341 2.964-4.082 5.54-4.082z"
              />
            </svg>

            {isGoogleSubmitting ? "Connecting..." : "Continue with Google"}
          </button>

          <p className="text-center text-xs text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-[#087ff5] transition hover:text-[#066ed6] hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
