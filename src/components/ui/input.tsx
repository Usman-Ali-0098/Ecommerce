import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
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
            className="mb-2 block text-base text-[#212529]"
          >
            {label}
          </label>
        ) : null}

        <div className="relative">
          {leftIcon ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#6c757d]">
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
              "h-12 w-full rounded border bg-white px-3 text-base text-[#212529]",
              "outline-none transition-colors",
              "placeholder:text-[#6c757d]",
              "disabled:cursor-not-allowed disabled:bg-[#f1f3f5] disabled:opacity-70",
              leftIcon && "pl-10",
              rightIcon && "pr-11",
              error
                ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                : "border-[#ced4da] focus:border-[#86b7fe] focus:ring-4 focus:ring-blue-100",
              className
            )}
            {...props}
          />

          {rightIcon ? (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#343a40]">
              {rightIcon}
            </div>
          ) : null}
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
  }
);

export default Input;