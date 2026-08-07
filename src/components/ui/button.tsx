import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "outline"
  | "danger"
  | "ghost";

type ButtonSize =
  | "sm"
  | "md"
  | "lg";

type ButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
  };

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-[#087ff5] bg-[#087ff5] text-white hover:bg-[#066ed6]",

  outline:
    "border-[#087ff5] bg-white text-[#087ff5] hover:bg-blue-50",

  danger:
    "border-red-500 bg-red-500 text-white hover:bg-red-600",

  ghost:
    "border-transparent bg-transparent text-[#087ff5] hover:bg-blue-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-12 px-7 text-lg",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      disabled,
      className,
      type = "button",
      ...props
    },
    ref
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          "inline-flex items-center justify-center rounded border",
          "font-normal transition-colors",
          "focus-visible:outline-none focus-visible:ring-4",
          "focus-visible:ring-blue-100",
          "disabled:cursor-not-allowed disabled:opacity-60",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <LoadingSpinner />
            Please wait...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

export default Button;

function LoadingSpinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}