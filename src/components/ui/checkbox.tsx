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

const Checkbox = forwardRef<
  HTMLInputElement,
  CheckboxProps
>(function Checkbox(
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
  const errorId =
    error
      ? `${id}-error`
      : undefined;

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className={cn(
          "inline-flex cursor-pointer items-center gap-2",
          disabled &&
            "cursor-not-allowed opacity-60",
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
            "h-3.5 w-3.5 shrink-0 rounded border-gray-300",
            "accent-[#087ff5]",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-blue-100",
            "disabled:cursor-not-allowed"
          )}
          {...props}
        />

        <span className="text-xs leading-5 text-gray-600">
          {label}
        </span>
      </label>

      {error ? (
        <p
          id={errorId}
          className="mt-1.5 text-xs text-red-500"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
});

export default Checkbox;