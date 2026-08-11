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
  type FormEvent,
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
  type LoginInput,
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
  ] = useState<LoginInput>(
    initialForm
  );

  const [
    errors,
    setErrors,
  ] = useState<LoginErrors>(
    {}
  );

  const [
    rememberMe,
    setRememberMe,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  function updateField(
    field: keyof LoginInput,
    value: string
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]:
          value,
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
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

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

      showAlert(
        "Please correct the form errors.",
        {
          variant:
            "error",
        }
      );

      return;
    }

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
       * Step 1:
       * Verify credentials and
       * identify account role.
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
          {
            variant:
              "error",
          }
        );

        return;
      }

      /*
       * Step 2:
       * Admin login.
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
                  rememberMe,
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
            {
              variant:
                "error",
            }
          );

          return;
        }

        router.replace(
          "/admin/products"
        );

        router.refresh();

        return;
      }

      /*
       * Step 3:
       * Customer login.
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


      rememberMe:
        rememberMe
          ? "true"
          : "false",



              redirect:
                false,
            }
          );

        if (
          !result ||
          result.error
        ) {
          showAlert(
            "Invalid email or password.",
            {
              variant:
                "error",
            }
          );

          return;
        }

        router.replace(
          "/"
        );

        router.refresh();

        return;
      }

      showAlert(
        "This account role is not supported.",
        {
          variant:
            "error",
        }
      );
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      showAlert(
        "Something went wrong while logging in.",
        {
          variant:
            "error",
        }
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      description="Sign in to continue to your account."
    >
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
          className="space-y-4"
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            label="Email Address"
            placeholder="Enter your email"
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
            placeholder="Enter your password"
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

         <div className="flex items-center justify-between gap-3">
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
    className="shrink-0 text-xs font-medium text-[#087ff5] transition hover:text-[#066ed6] hover:underline"
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
            disabled={
              isSubmitting
            }
          >
            Sign In
          </Button>

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