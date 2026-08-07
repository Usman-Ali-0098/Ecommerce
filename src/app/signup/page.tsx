"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import AuthCard from "@/components/auth/auth-card";
import AuthLayout from "@/components/auth/auth-layout";
import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import PasswordInput from "@/components/ui/password-input";
import { useAlert } from "@/hooks/use-alert";
import {
  signupSchema,
  type SignupInput,
} from "@/lib/validations/auth";

type SignupErrors = Partial<
  Record<keyof SignupInput, string>
>;

type SignupApiResponse = {
  success: boolean;
  message: string;
  errors?: Partial<
    Record<keyof SignupInput, string[]>
  >;
};

const initialForm: SignupInput = {
  fullName: "",
  email: "",
  mobile: "",
  password: "",
  confirmPassword: "",
};

export default function SignupPage() {
  const router = useRouter();
  const { alert, showAlert, closeAlert } = useAlert();

  const [form, setForm] =
    useState<SignupInput>(initialForm);

  const [errors, setErrors] =
    useState<SignupErrors>({});

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  function updateField(
    field: keyof SignupInput,
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
      signupSchema.safeParse(form);

    if (!validationResult.success) {
      const fieldErrors: SignupErrors = {};

      for (
        const issue of validationResult.error.issues
      ) {
        const field = issue.path[0];

        if (
          typeof field === "string" &&
          !fieldErrors[
            field as keyof SignupInput
          ]
        ) {
          fieldErrors[
            field as keyof SignupInput
          ] = issue.message;
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

      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedData),
      });

      const data =
        (await response.json()) as SignupApiResponse;

      if (!response.ok || !data.success) {
        if (data.errors) {
          const backendErrors: SignupErrors = {};

          for (const field of Object.keys(
            data.errors
          ) as Array<keyof SignupInput>) {
            const messages = data.errors[field];

            if (messages?.[0]) {
              backendErrors[field] =
                messages[0];
            }
          }

          setErrors(backendErrors);
        }

        showAlert(
          data.message ||
            "Unable to create account.",
          {
            variant: "error",
          }
        );

        return;
      }

      setForm(initialForm);

      showAlert("Account created successfully.", {
        variant: "success",
        duration: 1800,
      });

      window.setTimeout(() => {
        router.push("/login");
      }, 900);
    } catch (error) {
      console.error("Signup error:", error);

      showAlert(
        "Unable to create your account right now. Please try again.",
        {
          variant: "error",
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="SignUp" width="md">
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
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            label="Full Name"
            placeholder="Please enter your full name"
            value={form.fullName}
            error={errors.fullName}
            disabled={isSubmitting}
            onChange={(event) =>
              updateField(
                "fullName",
                event.target.value
              )
            }
          />

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
              updateField(
                "email",
                event.target.value
              )
            }
          />

          <Input
            id="mobile"
            name="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            label="Mobile"
            placeholder="Please enter your mobile number"
            value={form.mobile}
            error={errors.mobile}
            disabled={isSubmitting}
            onChange={(event) =>
              updateField(
                "mobile",
                event.target.value
              )
            }
          />

          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
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

          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            label="Confirm Password"
            placeholder="Please confirm your password"
            value={form.confirmPassword}
            error={errors.confirmPassword}
            disabled={isSubmitting}
            onChange={(event) =>
              updateField(
                "confirmPassword",
                event.target.value
              )
            }
          />

          <Button
            type="submit"
            fullWidth
            loading={isSubmitting}
          >
            Sign Up
          </Button>

          <p className="text-center text-sm text-[#6c757d]">
            Already have an account?{" "}
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