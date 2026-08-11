"use client";

import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

type PasswordInputProps =
  InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
    helperText?: string;
  };

const PasswordInput = forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(function PasswordInput(
  {
    id,
    label,
    error,
    helperText,
    className,
    disabled,
    ...props
  },
  ref
) {
  const [isVisible, setIsVisible] =
    useState(false);

  const describedBy = error
    ? `${id}-error`
    : helperText
      ? `${id}-helper`
      : undefined;

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={id}
          className="mb-1.5 block text-xs font-medium text-gray-700"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={
            isVisible
              ? "text"
              : "password"
          }
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            "h-10 w-full rounded-md border bg-white px-3 pr-10 text-sm text-gray-800",
            "outline-none transition",
            "placeholder:text-gray-400",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70",
            error
              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
              : "border-gray-300 focus:border-[#087ff5] focus:ring-2 focus:ring-blue-100",
            className
          )}
          {...props}
        />

        <button
          type="button"
          onClick={() =>
            setIsVisible(
              (current) =>
                !current
            )
          }
          aria-label={
            isVisible
              ? "Hide password"
              : "Show password"
          }
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-400 transition hover:text-[#087ff5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-100"
        >
          {isVisible ? (
            <EyeOffIcon />
          ) : (
            <EyeIcon />
          )}
        </button>
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          className="mt-1.5 text-xs text-red-500"
        >
          {error}
        </p>
      ) : helperText ? (
        <p
          id={`${id}-helper`}
          className="mt-1.5 text-xs text-gray-500"
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default PasswordInput;

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-[18px] w-[18px]"
    >
      <path
        d="M2.5 12C4.7 8.1 7.9 6 12 6s7.3 2.1 9.5 6c-2.2 3.9-5.4 6-9.5 6s-7.3-2.1-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-[18px] w-[18px]"
    >
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="M10.8 6.1c.4-.1.8-.1 1.2-.1 4.1 0 7.3 2.1 9.5 6a13.8 13.8 0 0 1-2.2 2.9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="M6.2 7.1A13.5 13.5 0 0 0 2.5 12c2.2 3.9 5.4 6 9.5 6 1.2 0 2.3-.2 3.3-.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}