import type { CartItemData } from "@/types/cart";

import CartItemRow from "@/components/cart/cart-item-row";

type CartTableProps = {
  items: CartItemData[];

  selectedItemIds: string[];
  allSelected: boolean;

  updatingItemIds: string[];

  deletingItemId: string | null;

  onToggleItem: (itemId: string) => void;

  onToggleAll: () => void;

  onUpdateQuantity: (itemId: string, quantity: number) => void;

  onDeleteItem: (itemId: string) => void;

  onDeleteSelected: () => void;
  isDeletingAll: boolean;
};

export default function CartTable({
  items,
  selectedItemIds,
  allSelected,
  updatingItemIds,
  deletingItemId,
  onToggleItem,
  onToggleAll,
  onUpdateQuantity,
  onDeleteItem,
  onDeleteSelected,
  isDeletingAll,
}: CartTableProps) {
  const selectedCount = selectedItemIds.length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
        <span className="text-xs text-gray-500">
          {selectedCount > 0
            ? `${selectedCount} of ${items.length} selected`
            : "No items selected"}
        </span>

        <button
          type="button"
          onClick={onDeleteSelected}
          disabled={selectedCount === 0 || isDeletingAll}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <TrashIcon />
          {isDeletingAll
            ? "Deleting..."
            : `Delete Selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-225 border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleAll}
                    aria-label="Select all cart items"
                    className="h-3.5 w-3.5 cursor-pointer accent-[#087ff5]"
                  />

                  <span>Product</span>
                </div>
              </th>

              <th className="px-4 py-2.5">Color</th>

              <th className="px-4 py-2.5">Size</th>

              <th className="px-4 py-2.5">Qty</th>

              <th className="px-4 py-2.5">Price</th>

              <th className="px-4 py-2.5">Total</th>

              <th className="px-4 py-2.5 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                selected={selectedItemIds.includes(item.id)}
                isUpdating={updatingItemIds.includes(item.id)}
                isDeleting={deletingItemId === item.id}
                onToggle={() => onToggleItem(item.id)}
                onDecrease={() => onUpdateQuantity(item.id, item.quantity - 1)}
                onIncrease={() => onUpdateQuantity(item.id, item.quantity + 1)}
                onDelete={() => onDeleteItem(item.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M4 7h16" />

      <path d="M9 7V4h6v3" />

      <path d="M6 7l1 13h10l1-13" />

      <path d="M10 11v5" />

      <path d="M14 11v5" />
    </svg>
  );
}
