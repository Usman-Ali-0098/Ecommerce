"use client";

import {
  useState,
  type InputHTMLAttributes,
} from "react";

type PasswordFieldProps =
  InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
  };

export default function PasswordField({
  label,
  error,
  id,
  className = "",
  ...inputProps
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-lg text-[#212529]"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={[
            "h-12 w-full rounded border bg-white px-3 pr-12 text-base",
            "text-[#212529] outline-none transition",
            "placeholder:text-[#6c757d]",
            error
              ? "border-red-500 focus:border-red-500"
              : "border-[#ced4da] focus:border-[#86b7fe] focus:ring-4 focus:ring-blue-100",
            className,
          ].join(" ")}
          {...inputProps}
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={
            visible ? "Hide password" : "Show password"
          }
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#343a40]"
        >
          {visible ? (
            <EyeOffIcon />
          ) : (
            <EyeIcon />
          )}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 12C4.4 7.8 7.7 5.7 12 5.7C16.3 5.7 19.6 7.8 22 12C19.6 16.2 16.3 18.3 12 18.3C7.7 18.3 4.4 16.2 2 12Z"
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
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3L21 21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.6 6C11.1 5.9 11.5 5.8 12 5.8C16.3 5.8 19.6 7.9 22 12C21.2 13.4 20.3 14.5 19.3 15.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.1 7.1C4.5 8.2 3.1 9.8 2 12C4.4 16.2 7.7 18.3 12 18.3C13.2 18.3 14.3 18.1 15.3 17.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}