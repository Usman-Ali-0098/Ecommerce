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
}: CartTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
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
  );
}
