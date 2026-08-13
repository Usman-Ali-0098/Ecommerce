"use client";

import { FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

import Input from "@/components/ui/input";
import PasswordInput from "@/components/ui/password-input";
import Button from "@/components/ui/button";
import Alert from "@/components/ui/alert";

import { useAlert } from "@/hooks/use-alert";

export default function AdminLoginForm() {
  const router = useRouter();

  const { alert, showAlert, closeAlert } = useAlert();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      showAlert("Please enter your email and password.", {
        variant: "warning",
      });

      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/admin/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showAlert(result.message ?? "Invalid admin credentials.", {
          variant: "error",
        });

        return;
      }

      router.replace("/admin/products");

      router.refresh();
    } catch (error) {
      console.error("Admin login request error:", error);

      showAlert("Something went wrong while logging in.", { variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Admin Login</h1>

          <p className="mt-2 text-sm text-gray-500">
            Sign in to manage your ecommerce store.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            autoComplete="email"
          />

          <PasswordInput
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Signing in..." : "Login"}
          </Button>
        </form>
      </div>

      {alert ? (
        <Alert
          message={alert.message}
          variant={alert.variant}
          onClose={closeAlert}
        />
      ) : null}
    </>
  );
}
