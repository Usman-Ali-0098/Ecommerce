"use client";

type DeleteCartItemModalProps = {
  open: boolean;
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteCartItemModal({
  open,
  isDeleting = false,
  onCancel,
  onConfirm,
}: DeleteCartItemModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4">
      <div className="relative w-full max-w-[360px] rounded-lg bg-white p-6 shadow-xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CloseIcon />
        </button>

        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <WarningIcon />
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Remove Product?
          </h2>

          <p className="mx-auto mt-2 max-w-[260px] text-sm leading-5 text-gray-500">
            Are you sure you want to remove this product from your cart?
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-center gap-3 ">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="h-9 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-9 min-w-[84px] rounded-md bg-blue-500 px-4 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting
              ? "Removing..."
              : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7 text-amber-500"
      aria-hidden="true"
    >
      <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}