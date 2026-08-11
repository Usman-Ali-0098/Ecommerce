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

const variantClasses: Record<
  ButtonVariant,
  string
> = {
  primary:
    "border-[#087ff5] bg-[#087ff5] text-white hover:bg-[#066ed6]",

  outline:
    "border-[#087ff5] bg-white text-[#087ff5] hover:bg-blue-50",

  danger:
    "border-red-500 bg-red-500 text-white hover:bg-red-600",

  ghost:
    "border-transparent bg-transparent text-[#087ff5] hover:bg-blue-50",
};

const sizeClasses: Record<
  ButtonSize,
  string
> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

const Button =
  forwardRef<
    HTMLButtonElement,
    ButtonProps
  >(function Button(
    {
      children,
      variant =
        "primary",
      size = "md",
      fullWidth =
        false,
      loading =
        false,
      disabled,
      className,
      type = "button",
      ...props
    },
    ref
  ) {
    const isDisabled =
      disabled ||
      loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={
          isDisabled
        }
        aria-busy={
          loading
        }
        className={cn(
          "inline-flex items-center justify-center rounded-md border font-medium transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100",
          "disabled:cursor-not-allowed disabled:opacity-60",
          variantClasses[
            variant
          ],
          sizeClasses[
            size
          ],
          fullWidth &&
            "w-full",
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
  });

export default Button;

function LoadingSpinner() {
  return (
    <span
      aria-hidden="true"
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}