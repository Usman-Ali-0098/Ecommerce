"use client";

import { cn } from "@/lib/utils";

export type AlertVariant =
  | "success"
  | "error"
  | "info"
  | "warning";

type AlertProps = {
  message: string;
  variant?: AlertVariant;
  onClose?: () => void;
};

const variantClasses: Record<AlertVariant, string> = {
  success:
    "border-[#badbcc] bg-[#d1e7dd] text-[#0f5132]",

  error:
    "border-[#f5c2c7] bg-[#f8d7da] text-[#842029]",

  info:
    "border-[#b6d4fe] bg-[#cfe2ff] text-[#084298]",

  warning:
    "border-[#ffecb5] bg-[#fff3cd] text-[#664d03]",
};

export default function Alert({
  message,
  variant = "info",
  onClose,
}: AlertProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "fixed right-4 top-4 z-50",
        "flex w-[calc(100%-2rem)] max-w-[520px]",
        "items-start justify-between gap-4",
        "rounded border px-5 py-4",
        "text-sm shadow-sm",
        variantClasses[variant]
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <AlertIcon variant={variant} />

        <p className="break-words leading-5">
          {message}
        </p>
      </div>

      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close alert"
          className={cn(
            "shrink-0 rounded px-1 text-xl leading-none",
            "opacity-60 transition hover:opacity-100",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-current"
          )}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

function AlertIcon({
  variant,
}: {
  variant: AlertVariant;
}) {
  if (variant === "success") {
    return (
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="mt-0.5 shrink-0"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="m8 12 2.5 2.5L16 9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (variant === "error") {
    return (
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="mt-0.5 shrink-0"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="m9 9 6 6M15 9l-6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (variant === "warning") {
    return (
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="mt-0.5 shrink-0"
      >
        <path
          d="M12 4 21 20H3L12 4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M12 9v5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle
          cx="12"
          cy="17"
          r="1"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="mt-0.5 shrink-0"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 11v5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="8"
        r="1"
        fill="currentColor"
      />
    </svg>
  );
}