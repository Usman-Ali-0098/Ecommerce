"use client";

import { useEffect, useRef, useState } from "react";

export type AdminDropdownOption = {
  value: string;
  label: string;
};

type AdminFilterDropdownProps = {
  value: string;
  options: AdminDropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

// Same interaction pattern as the storefront's FilterDropdown, restyled to
// match the admin panel's chrome (rounded-lg, gray-200 border, blue-600
// accents) so filters look native to the dashboard.
export default function AdminFilterDropdown({
  value,
  options,
  onChange,
  placeholder = "Select...",
  className,
}: AdminFilterDropdownProps) {
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((option) => option.value === value);

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        close();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>

        <SelectArrowIcon open={open} />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-45 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
          <div className="max-h-60 overflow-y-auto p-1.5">
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    close();
                  }}
                  className={`flex w-full items-center rounded-md border px-3 py-2 text-left text-xs transition ${
                    isSelected
                      ? "border-blue-100 bg-blue-50 font-medium text-blue-600"
                      : "border-transparent text-gray-700 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SelectArrowIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${
        open ? "rotate-180" : ""
      }`}
      aria-hidden="true"
    >
      <path
        d="M6 8L10 12L14 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
