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
  const TAX_RATE = 0.1;

  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return (
    <div className="ml-auto mt-8 w-full max-w-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Selected Items:
          </span>

          <span className="font-semibold text-gray-800">
            {selectedCount}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Sub Total:
          </span>

          <span className="font-semibold text-gray-800">
            Rs.{" "}
            {subtotal.toLocaleString("en-PK", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Tax (10%):
          </span>

          <span className="font-semibold text-gray-800">
            Rs.{" "}
            {tax.toLocaleString("en-PK", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <span className="font-medium text-gray-700">
            Total:
          </span>

          <span className="text-lg font-semibold text-gray-900">
            Rs.{" "}
            {total.toLocaleString("en-PK", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={
            selectedCount === 0 ||
            isPlacingOrder
          }
          className="h-12 w-full rounded-md bg-[#087ff5] text-base font-medium text-white transition hover:bg-[#066ed6] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isPlacingOrder
            ? "Placing Order..."
            : "Place Order"}
        </button>
      </div>
    </div>
  );
}