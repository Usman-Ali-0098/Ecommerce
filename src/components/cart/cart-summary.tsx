type CartSummaryProps = {
  subtotal: number;
  selectedCount: number;
  isPlacingOrder: boolean;
  onPlaceOrder: () => void;
};

export default function CartSummary({
  subtotal,
  selectedCount,
  isPlacingOrder,
  onPlaceOrder,
}: CartSummaryProps) {
  const TAX_RATE =
    0.1;

  const tax =
    subtotal *
    TAX_RATE;

  const total =
    subtotal +
    tax;

  return (
    <div className="ml-auto mt-6 w-full max-w-sm">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Order Summary
        </h2>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Selected Items
            </span>

            <span className="font-semibold text-gray-800">
              {
                selectedCount
              }
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Subtotal
            </span>

            <span className="font-medium text-gray-800">
              Rs.{" "}
              {subtotal.toLocaleString(
                "en-PK",
                {
                  minimumFractionDigits:
                    2,

                  maximumFractionDigits:
                    2,
                }
              )}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Tax (10%)
            </span>

            <span className="font-medium text-gray-800">
              Rs.{" "}
              {tax.toLocaleString(
                "en-PK",
                {
                  minimumFractionDigits:
                    2,

                  maximumFractionDigits:
                    2,
                }
              )}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="text-xs font-semibold text-gray-700">
              Total
            </span>

            <span className="text-base font-semibold text-gray-900">
              Rs.{" "}
              {total.toLocaleString(
                "en-PK",
                {
                  minimumFractionDigits:
                    2,

                  maximumFractionDigits:
                    2,
                }
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={
              onPlaceOrder
            }
            disabled={
              selectedCount ===
                0 ||
              isPlacingOrder
            }
            className="h-10 w-full rounded-md bg-[#087ff5] text-xs font-semibold text-white transition hover:bg-[#066ed6] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isPlacingOrder
              ? "Placing Order..."
              : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}