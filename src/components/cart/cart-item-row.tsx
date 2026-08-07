import Image from "next/image";

import type { CartItemData } from "@/types/cart";

type CartItemRowProps = {
  item: CartItemData;

  selected: boolean;

  isUpdating: boolean;
  isDeleting: boolean;

  onToggle: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onDelete: () => void;
};

export default function CartItemRow({
  item,
  selected,
  isUpdating,
  isDeleting,
  onToggle,
  onDecrease,
  onIncrease,
  onDelete,
}: CartItemRowProps) {
  const busy =
    isUpdating || isDeleting;

  return (
    <tr className="border-b border-gray-200 text-sm text-gray-700 last:border-b-0">
      <td className="px-4 py-3">
        <div className="flex min-w-[320px] items-center gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select ${item.product.name}`}
            className="h-4 w-4 shrink-0 cursor-pointer accent-[#087ff5]"
          />

          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
            {item.product.image ? (
              <Image
                src={item.product.image.url}
                alt={
                  item.product.image.altText ??
                  item.product.name
                }
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-gray-400">
                No image
              </div>
            )}
          </div>

          <p className="max-w-[420px] leading-5 text-gray-700">
            {item.product.name}
          </p>
        </div>
      </td>

      <td className="px-4 py-3">
        {item.variant.color?.name ?? "—"}
      </td>

      <td className="px-4 py-3">
        {item.variant.size?.name ?? "—"}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDecrease}
            disabled={
              busy ||
              item.quantity <= 1
            }
            aria-label="Decrease quantity"
            className="flex h-9 w-9 items-center justify-center rounded border border-gray-300 text-lg text-[#087ff5] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>

          <div className="flex h-9 min-w-16 items-center justify-center rounded border border-gray-300 px-3 text-base">
            {isUpdating
              ? "..."
              : String(
                  item.quantity
                ).padStart(2, "0")}
          </div>

          <button
            type="button"
            onClick={onIncrease}
            disabled={
              busy ||
              item.quantity >=
                item.variant.stock
            }
            aria-label="Increase quantity"
            className="flex h-9 w-9 items-center justify-center rounded border border-gray-300 text-lg text-[#087ff5] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
      </td>

      <td className="px-4 py-3">
        Rs.{" "}
        {item.variant.price.toLocaleString(
          "en-PK"
        )}
      </td>

      <td className="px-4 py-3">
        Rs.{" "}
        {item.lineTotal.toLocaleString(
          "en-PK"
        )}
      </td>

      <td className="px-4 py-3 text-center">
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label="Remove item"
          className="inline-flex h-9 w-9 items-center justify-center rounded text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isDeleting ? (
            <span className="text-xs">
              ...
            </span>
          ) : (
            <TrashIcon />
          )}
        </button>
      </td>
    </tr>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
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