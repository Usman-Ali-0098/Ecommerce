import type { getUserCart } from "@/lib/services/cart.service";

export type CartData =
  Awaited<
    ReturnType<typeof getUserCart>
  >;

export type CartItemData =
  CartData["items"][number];