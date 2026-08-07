import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: ReactNode;
  error?: string;
};

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      id,
      label,
      error,
      className,
      disabled,
      ...props
    },
    ref
  ) {
    const errorId = error ? `${id}-error` : undefined;

    return (
      <div className="w-full">
        <label
          htmlFor={id}
          className={cn(
            "inline-flex cursor-pointer items-start gap-2",
            disabled && "cursor-not-allowed opacity-60",
            className
          )}
        >
          <input
            ref={ref}
            id={id}
            type="checkbox"
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 rounded border-[#adb5bd]",
              "accent-[#087ff5]",
              "focus-visible:outline-none focus-visible:ring-4",
              "focus-visible:ring-blue-100",
              "disabled:cursor-not-allowed"
            )}
            {...props}
          />

          <span className="text-sm leading-5 text-[#212529]">
            {label}
          </span>
        </label>

        {error ? (
          <p
            id={errorId}
            className="mt-2 text-sm text-red-500"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

export default Checkbox;