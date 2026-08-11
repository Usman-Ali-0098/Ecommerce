"use client";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
  type FormEvent,
} from "react";

import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import PasswordInput from "@/components/ui/password-input";

import {
  useAlert,
} from "@/hooks/use-alert";

import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

type ResetPasswordFormProps = {
  token: string;
};

type ResetPasswordFormState =
  Pick<
    ResetPasswordInput,
    "password" | "confirmPassword"
  >;

type ResetPasswordErrors =
  Partial<
    Record<
      keyof ResetPasswordInput,
      string
    >
  >;

type ResetPasswordApiResponse = {
  success: boolean;
  message: string;

  errors?: Partial<
    Record<
      keyof ResetPasswordInput,
      string[]
    >
  >;
};

const initialForm: ResetPasswordFormState = {
  password: "",
  confirmPassword: "",
};

export default function ResetPasswordForm({
  token,
}: ResetPasswordFormProps) {
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
    useState<ResetPasswordFormState>(
      initialForm
    );

  const [
    errors,
    setErrors,
  ] =
    useState<ResetPasswordErrors>(
      {}
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  function updateField(
    field:
      keyof ResetPasswordFormState,
    value: string
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

    const validationResult =
      resetPasswordSchema.safeParse({
        token,
        password:
          form.password,
        confirmPassword:
          form.confirmPassword,
      });

    if (
      !validationResult.success
    ) {
      const fieldErrors:
        ResetPasswordErrors =
          {};

      for (
        const issue
        of validationResult.error
          .issues
      ) {
        const field =
          issue.path[0];

        if (
          typeof field ===
            "string" &&
          !fieldErrors[
            field as keyof ResetPasswordInput
          ]
        ) {
          fieldErrors[
            field as keyof ResetPasswordInput
          ] =
            issue.message;
        }
      }

      setErrors(
        fieldErrors
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

    setIsSubmitting(
      true
    );

    setErrors(
      {}
    );

    try {
      const response =
        await fetch(
          "/api/auth/reset-password",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                validationResult.data
              ),
          }
        );

      const data =
        (await response.json()) as ResetPasswordApiResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        const backendErrors:
          ResetPasswordErrors =
            {};

        if (
          data.errors
        ) {
          for (
            const field
            of Object.keys(
              data.errors
            ) as Array<
              keyof ResetPasswordInput
            >
          ) {
            const messages =
              data.errors[
                field
              ];

            if (
              messages?.[0]
            ) {
              backendErrors[
                field
              ] =
                messages[0];
            }
          }
        }

        setErrors(
          backendErrors
        );

        const normalizedMessage =
          data.message?.toLowerCase() ??
          "";

        const isExpiredOrUsed =
          normalizedMessage.includes(
            "expired"
          ) ||
          normalizedMessage.includes(
            "already been used"
          ) ||
          normalizedMessage.includes(
            "invalid"
          );

        showAlert(
          data.message ||
            "Unable to reset your password.",
          {
            variant:
              isExpiredOrUsed
                ? "warning"
                : "error",

            duration:
              7000,
          }
        );

        return;
      }

      setForm(
        initialForm
      );

      showAlert(
        data.message ||
          "Your password has been reset successfully.",
        {
          variant:
            "success",

          duration:
            2500,
        }
      );

      window.setTimeout(
        () => {
          router.replace(
            "/login"
          );

          router.refresh();
        },
        1500
      );
    } catch (error) {
      console.error(
        "Reset password error:",
        error
      );

      showAlert(
        "Unable to reset your password right now. Please try again.",
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
    <>
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

      <form
        onSubmit={
          handleSubmit
        }
        noValidate
        className="space-y-4"
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          label="New Password"
          placeholder="Enter your new password"
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

        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          label="Confirm Password"
          placeholder="Confirm your new password"
          value={
            form.confirmPassword
          }
          error={
            errors.confirmPassword
          }
          disabled={
            isSubmitting
          }
          onChange={(
            event
          ) =>
            updateField(
              "confirmPassword",
              event.target
                .value
            )
          }
        />

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
          Reset Password
        </Button>

        <p className="text-center text-xs text-gray-500">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-[#087ff5] transition hover:text-[#066ed6] hover:underline"
          >
            Sign In
          </Link>
        </p>
      </form>
    </>
  );
}