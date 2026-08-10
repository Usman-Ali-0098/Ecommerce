"use client";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";
import {
  signIn,
} from "next-auth/react";
import {
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import AuthCard from "@/components/auth/auth-card";
import AuthLayout from "@/components/auth/auth-layout";
import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Input from "@/components/ui/input";
import PasswordInput from "@/components/ui/password-input";

import {
  useAlert,
} from "@/hooks/use-alert";

import {
  loginSchema,
} from "@/lib/validations/auth";

import type {
  LoginInput,
} from "@/lib/validations/auth";

type LoginErrors = Partial<
  Record<
    keyof LoginInput,
    string
  >
>;

const initialForm: LoginInput = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router =
    useRouter();

  const {
    alert,
    showAlert,
    closeAlert,
  } = useAlert();

  const [
    form,
    setForm,
  ] =
    useState<LoginInput>(
      initialForm
    );

  const [
    errors,
    setErrors,
  ] =
    useState<LoginErrors>({});

  const [
    rememberMe,
    setRememberMe,
  ] =
    useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  function updateField(
    field:
      keyof LoginInput,
    value:
      string
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );

    if (
      errors[field]
    ) {
      setErrors(
        (current) => ({
          ...current,
          [field]:
            undefined,
        })
      );
    }
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    /*
     * Validate form first.
     */
    const validation =
      loginSchema.safeParse(
        form
      );

    if (
      !validation.success
    ) {
      const nextErrors:
        LoginErrors = {};

      for (
        const issue
        of validation.error
          .issues
      ) {
        const field =
          issue.path[0];

        if (
          field ===
            "email" ||
          field ===
            "password"
        ) {
          nextErrors[
            field
          ] =
            issue.message;
        }
      }

      setErrors(
        nextErrors
      );

      return;
    }

    /*
     * Use validated strings.
     */
    const {
      email,
      password,
    } =
      validation.data;

    try {
      setIsSubmitting(
        true
      );

      /*
       * STEP 1
       *
       * Verify credentials and
       * determine account role.
       */
      const roleResponse =
        await fetch(
          "/api/login-role",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                email,
                password,
              }),
          }
        );

      const roleResult =
        await roleResponse.json();

      if (
        !roleResponse.ok
      ) {
        showAlert(
          roleResult.message ??
            "Invalid email or password.",
          "error"
        );

        return;
      }

      /*
       * STEP 2
       *
       * ADMIN LOGIN
       *
       * Admin uses the existing
       * separate admin_session cookie.
       */
      if (
        roleResult.role ===
        "ADMIN"
      ) {
        const adminResponse =
          await fetch(
            "/api/admin/login",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  email,
                  password,
                }),
            }
          );

        const adminResult =
          await adminResponse.json();

        if (
          !adminResponse.ok
        ) {
          showAlert(
            adminResult.message ??
              "Unable to login as admin.",
            "error"
          );

          return;
        }

        /*
         * Admin goes directly
         * to admin dashboard.
         */
        router.replace(
          "/admin/products"
        );

        router.refresh();

        return;
      }

      /*
       * STEP 3
       *
       * CUSTOMER LOGIN
       *
       * Customer continues using
       * Auth.js Credentials provider.
       */
      if (
        roleResult.role ===
        "USER"
      ) {
        const result =
          await signIn(
            "credentials",
            {
              email,
              password,
              redirect: false,
            }
          );

        if (
          !result ||
          result.error
        ) {
          showAlert(
            "Invalid email or password.",
            "error"
          );

          return;
        }

        router.replace(
          "/"
        );

        router.refresh();

        return;
      }

      /*
       * Unknown role protection.
       */
      showAlert(
        "This account role is not supported.",
        "error"
      );
    } catch (
      error
    ) {
      console.error(
        "Login error:",
        error
      );

      showAlert(
        "Something went wrong while logging in.",
        "error"
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  return (
    <AuthLayout>
      {alert ? (
        <Alert
          message={
            alert.message
          }
          variant={
            alert.variant
          }
          onClose={
            closeAlert
          }
        />
      ) : null}

      <AuthCard>
        <form
          onSubmit={
            handleSubmit
          }
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
            value={
              form.email
            }
            error={
              errors.email
            }
            disabled={
              isSubmitting
            }
            onChange={(
              event
            ) =>
              updateField(
                "email",
                event.target
                  .value
              )
            }
          />

          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            label="Password"
            placeholder="Please enter password"
            value={
              form.password
            }
            error={
              errors.password
            }
            disabled={
              isSubmitting
            }
            onChange={(
              event
            ) =>
              updateField(
                "password",
                event.target
                  .value
              )
            }
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Checkbox
              id="rememberMe"
              name="rememberMe"
              label="Remember me"
              checked={
                rememberMe
              }
              disabled={
                isSubmitting
              }
              onChange={(
                event
              ) =>
                setRememberMe(
                  event.target
                    .checked
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
            loading={
              isSubmitting
            }
          >
            Login
          </Button>

          <p className="text-center text-sm text-[#6c757d]">
            Don&apos;t have
            an account?{" "}
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