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

import { signupSchema, type SignupInput } from "@/lib/validations/auth";

type SignupErrors = Partial<Record<keyof SignupInput, string>>;

type SignupApiResponse = {
  success: boolean;

  message?: string;

  /*
   * Keeping this because your
   * current frontend already supports
   * field-specific backend errors.
   *
   * We can align the signup API
   * response shape separately.
   */
  errors?: Partial<Record<keyof SignupInput, string[]>>;
};

const initialForm: SignupInput = {
  fullName: "",
  email: "",
  mobile: "",
  password: "",
  confirmPassword: "",
};

export default function SignupForm() {
  const router = useRouter();

  const { alert, showAlert, closeAlert } = useAlert();

  const [form, setForm] = useState<SignupInput>(initialForm);

  const [errors, setErrors] = useState<SignupErrors>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * --------------------------------
   * UPDATE FIELD
   * --------------------------------
   */
  function updateField(field: keyof SignupInput, value: string) {
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

  /*
   * --------------------------------
   * SIGNUP
   * --------------------------------
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    /*
     * Client-side Zod validation.
     */
    const validationResult = signupSchema.safeParse(form);

    if (!validationResult.success) {
      const fieldErrors: SignupErrors = {};

      for (const issue of validationResult.error.issues) {
        const field = issue.path[0];

        if (
          typeof field === "string" &&
          !fieldErrors[field as keyof SignupInput]
        ) {
          fieldErrors[field as keyof SignupInput] = issue.message;
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
      const response = await fetch("/api/signup", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(validationResult.data),
      });

      const data = (await response.json()) as SignupApiResponse;

      if (!response.ok || !data.success) {
        /*
         * If the backend sends
         * field-specific validation
         * errors, display them.
         */
        if (data.errors) {
          const backendErrors: SignupErrors = {};

          for (const field of Object.keys(data.errors) as Array<
            keyof SignupInput
          >) {
            const messages = data.errors[field];

            if (messages?.[0]) {
              backendErrors[field] = messages[0];
            }
          }

          setErrors(backendErrors);
        }

        showAlert(data.message || "Unable to create account.", {
          variant: "error",
        });

        return;
      }

      /*
       * Signup succeeded.
       */
      setForm(initialForm);

      showAlert("Account created successfully.", {
        variant: "success",

        duration: 1800,
      });

      /*
       * Account creation does not
       * automatically authenticate
       * the customer.
       *
       * Send them to login.
       *
       * replace() prevents the completed
       * signup form from staying directly
       * behind /login in browser history.
       */
      window.setTimeout(() => {
        router.replace("/login");
      }, 900);
    } catch (error) {
      console.error("Signup error:", error);

      showAlert("Unable to create your account right now. Please try again.", {
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  /*
   * --------------------------------
   * UI
   * --------------------------------
   */
  return (
    <AuthLayout
      title="Create Account"
      description="Enter your details to create your account."
      width="sm"
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
          {/* Full Name */}

          <Input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            label="Full Name"
            placeholder="Enter your full name"
            value={form.fullName}
            error={errors.fullName}
            disabled={isSubmitting}
            onChange={(event) => updateField("fullName", event.target.value)}
          />

          {/* Email */}

          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            label="Email Address"
            placeholder="Enter your email"
            value={form.email}
            error={errors.email}
            disabled={isSubmitting}
            onChange={(event) => updateField("email", event.target.value)}
          />

          {/* Mobile */}

          <Input
            id="mobile"
            name="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            label="Mobile Number"
            placeholder="Enter your mobile number"
            value={form.mobile}
            error={errors.mobile}
            disabled={isSubmitting}
            onChange={(event) => updateField("mobile", event.target.value)}
          />

          {/* Password */}

          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            label="Password"
            placeholder="Enter your password"
            value={form.password}
            error={errors.password}
            disabled={isSubmitting}
            onChange={(event) => updateField("password", event.target.value)}
          />

          {/* Confirm Password */}

          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            label="Confirm Password"
            placeholder="Confirm your password"
            value={form.confirmPassword}
            error={errors.confirmPassword}
            disabled={isSubmitting}
            onChange={(event) =>
              updateField("confirmPassword", event.target.value)
            }
          />

          {/* Submit */}

          <Button
            type="submit"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Create Account
          </Button>

          {/* Login */}

          <p className="text-center text-xs text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[#087ff5] transition hover:text-[#066ed6] hover:underline"
            >
              Sign In
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
