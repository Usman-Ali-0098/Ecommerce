"use client";

import {
  useEffect,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  className?: string;
};

export default function Modal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  closeOnBackdrop = true,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function handleBackdropClick() {
    if (closeOnBackdrop) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-8"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby={
          description ? "modal-description" : undefined
        }
        onMouseDown={(event) => event.stopPropagation()}
        className={cn(
          "w-full max-w-md rounded-md border border-[#dee2e6] bg-white",
          "shadow-lg",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#dee2e6] px-6 py-5">
          <div className="min-w-0">
            {title ? (
              <h2
                id="modal-title"
                className="text-xl font-medium text-[#212529]"
              >
                {title}
              </h2>
            ) : null}

            {description ? (
              <p
                id="modal-description"
                className="mt-2 text-sm leading-6 text-[#6c757d]"
              >
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className={cn(
              "shrink-0 rounded px-1 text-2xl leading-none text-[#6c757d]",
              "transition hover:text-[#212529]",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-[#86b7fe]"
            )}
          >
            ×
          </button>
        </div>

        {children ? (
          <div className="px-6 py-5">
            {children}
          </div>
        ) : null}

        {footer ? (
          <div className="flex flex-wrap justify-end gap-3 border-t border-[#dee2e6] px-6 py-4">
            {footer}
          </div>
        ) : null}
      </section>
    </div>
  );
}