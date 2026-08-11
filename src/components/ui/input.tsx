import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type InputProps =
  InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
  };

const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      id,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className,
      disabled,
      ...props
    },
    ref
  ) {
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
          {leftIcon ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              {leftIcon}
            </div>
          ) : null}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cn(
              "h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-800",
              "outline-none transition",
              "placeholder:text-gray-400",
              "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error
                ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                : "border-gray-300 focus:border-[#087ff5] focus:ring-2 focus:ring-blue-100",
              className
            )}
            {...props}
          />

          {rightIcon ? (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
              {rightIcon}
            </div>
          ) : null}
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
  }
);

export default Input;