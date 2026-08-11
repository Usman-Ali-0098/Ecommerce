import Image from "next/image";

import type {
  CartItemData,
} from "@/types/cart";

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
    isUpdating ||
    isDeleting;

  return (
    <tr className="border-b border-gray-100 text-xs text-gray-700 last:border-b-0 hover:bg-gray-50/50">
      <td className="px-4 py-3">
        <div className="flex min-w-[280px] items-center gap-3">
          <input
            type="checkbox"
            checked={
              selected
            }
            onChange={
              onToggle
            }
            aria-label={`Select ${item.product.name}`}
            className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#087ff5]"
          />

          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
            {item.product
              .image ? (
              <Image
                src={
                  item
                    .product
                    .image
                    .url
                }
                alt={
                  item
                    .product
                    .image
                    .altText ??
                  item
                    .product
                    .name
                }
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[9px] text-gray-400">
                No image
              </div>
            )}
          </div>

          <p className="max-w-[360px] font-medium leading-5 text-gray-800">
            {
              item.product
                .name
            }
          </p>
        </div>
      </td>

      <td className="px-4 py-3 text-gray-600">
        {item.variant
          .color?.name ??
          "—"}
      </td>

      <td className="px-4 py-3 text-gray-600">
        {item.variant
          .size?.name ??
          "—"}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center">
          <button
            type="button"
            onClick={
              onDecrease
            }
            disabled={
              busy ||
              item.quantity <=
                1
            }
            aria-label="Decrease quantity"
            className="flex h-8 w-8 items-center justify-center rounded-l-md border border-gray-300 text-sm text-[#087ff5] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>

          <div className="flex h-8 min-w-9 items-center justify-center border-y border-gray-300 px-2 text-xs font-medium">
            {isUpdating
              ? "..."
              : item.quantity}
          </div>

          <button
            type="button"
            onClick={
              onIncrease
            }
            disabled={
              busy ||
              item.quantity >=
                item.variant
                  .stock
            }
            aria-label="Increase quantity"
            className="flex h-8 w-8 items-center justify-center rounded-r-md border border-gray-300 text-sm text-[#087ff5] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-700">
        Rs.{" "}
        {item.variant.price.toLocaleString(
          "en-PK"
        )}
      </td>

      <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
        Rs.{" "}
        {item.lineTotal.toLocaleString(
          "en-PK"
        )}
      </td>

      <td className="px-4 py-3 text-center">
        <button
          type="button"
          onClick={
            onDelete
          }
          disabled={
            busy
          }
          aria-label="Remove item"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isDeleting ? (
            <span className="text-[10px]">
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
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
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