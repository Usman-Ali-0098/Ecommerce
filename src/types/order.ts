import type { getUserOrders } from "@/lib/services/order.service";

type UserOrdersResult =
  Awaited<
    ReturnType<typeof getUserOrders>
  >;

export type UserOrder =
  UserOrdersResult["orders"][number];