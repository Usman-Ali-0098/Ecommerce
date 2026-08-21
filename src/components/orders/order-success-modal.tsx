"use client";

type OrderSuccessModalProps = {
  open: boolean;

  orderNumber?: string | null;

  onViewOrder: () => void;

  onReturnHome: () => void;
};

export default function OrderSuccessModal({
  open,
  orderNumber,
  onViewOrder,
  onReturnHome,
}: OrderSuccessModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/45 px-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-success-title"
    >
      <div className="w-full max-w-90 rounded-xl border border-gray-200 bg-white px-6 py-7 shadow-2xl">
        {/* Success Icon */}

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-green-600"
            aria-hidden="true"
          >
            <path d="m5 12 4 4L19 6" />
          </svg>
        </div>

        {/* Content */}

        <div className="mt-5 text-center">
          <h2
            id="order-success-title"
            className="text-lg font-semibold tracking-tight text-gray-900"
          >
            Order Placed!
          </h2>

          <p className="mt-1.5 text-xs leading-5 text-gray-500">
            Your order has been successfully placed.
          </p>

          {orderNumber ? (
            <p className="mt-1 text-[11px] font-medium text-gray-400">
              {orderNumber}
            </p>
          ) : null}
        </div>

        {/* Actions */}

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={onViewOrder}
            className="h-10 w-full rounded-md bg-[#087ff5] px-4 text-sm font-semibold text-white transition hover:bg-[#006fdb] focus:outline-none focus:ring-2 focus:ring-[#087ff5]/30"
          >
            Check Order Details
          </button>

          <button
            type="button"
            onClick={onReturnHome}
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
