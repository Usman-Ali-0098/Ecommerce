"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronDown, Search } from "lucide-react";

export type DropdownOption = {
  value: string;
  label: string;
};

type FilterDropdownProps = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
};

// The first hand-rolled searchable dropdown in the app — same chrome as the
// header's account menu (rounded-xl panel, gray-200 border, shadow-xl), and
// the search box reuses the product search bar's exact input classes so it
// reads as the same control, not a new one.
export default function FilterDropdown({
  value,
  options,
  onChange,
  placeholder = "Select...",
  searchable = false,
  searchPlaceholder = "Search...",
  className,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selected = options.find((option) => option.value === value);

  const filteredOptions =
    searchable && query.trim()
      ? options.filter((option) =>
          option.label.toLowerCase().includes(query.trim().toLowerCase()),
        )
      : options;

  function close() {
    setOpen(false);
    setQuery("");
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

  useEffect(() => {
    if (open && searchable) {
      searchInputRef.current?.focus();
    }
  }, [open, searchable]);

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-[#d8dee8] bg-white px-3 text-xs text-gray-600 outline-none transition hover:border-gray-300 focus:border-[#087ff5]"
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>

        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
          {searchable ? (
            <div className="border-b border-gray-100 p-2">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full min-w-0 rounded-md border border-[#d8dee8] bg-white pl-3 pr-9 text-xs text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#087ff5]"
                />

                <span className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-gray-400">
                  <Search size={13} />
                </span>
              </div>
            </div>
          ) : null}

          <div className="max-h-60 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-[11px] text-gray-400">
                No matches found.
              </p>
            ) : (
              filteredOptions.map((option) => {
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
                        ? "border-blue-100 bg-blue-50 font-medium text-[#087ff5]"
                        : "border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
