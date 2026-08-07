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
  const [isVisible, setIsVisible] = useState(false);

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
          className="mb-2 block text-base text-[#212529]"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={isVisible ? "text" : "password"}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full rounded border bg-white px-3 pr-12 text-base text-[#212529]",
            "outline-none transition-colors",
            "placeholder:text-[#6c757d]",
            "disabled:cursor-not-allowed disabled:bg-[#f1f3f5] disabled:opacity-70",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
              : "border-[#ced4da] focus:border-[#86b7fe] focus:ring-4 focus:ring-blue-100",
            className
          )}
          {...props}
        />

        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={
            isVisible ? "Hide password" : "Show password"
          }
          aria-pressed={isVisible}
          className={cn(
            "absolute inset-y-0 right-0 flex w-12 items-center justify-center",
            "text-[#343a40] transition-colors hover:text-[#087ff5]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
            "focus-visible:ring-[#86b7fe]"
          )}
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          className="mt-2 text-sm text-red-500"
        >
          {error}
        </p>
      ) : helperText ? (
        <p
          id={`${id}-helper`}
          className="mt-2 text-sm text-[#6c757d]"
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
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M2.5 12C4.7 8.1 7.9 6 12 6s7.3 2.1 9.5 6c-2.2 3.9-5.4 6-9.5 6s-7.3-2.1-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M10.8 6.1c.4-.1.8-.1 1.2-.1 4.1 0 7.3 2.1 9.5 6a13.8 13.8 0 0 1-2.2 2.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M6.2 7.1A13.5 13.5 0 0 0 2.5 12c2.2 3.9 5.4 6 9.5 6 1.2 0 2.3-.2 3.3-.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}