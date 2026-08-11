import type {
  getUserOrderById,
  getUserOrders,
} from "@/lib/services/order.service";

type UserOrdersResult =
  Awaited<
    ReturnType<
      typeof getUserOrders
    >
  >;

export type UserOrder =
  UserOrdersResult["orders"][number];

type UserOrderDetailResult =
  Awaited<
    ReturnType<
      typeof getUserOrderById
    >
  >;

export type UserOrderDetail =
  NonNullable<
    UserOrderDetailResult
  >;

export type UserOrderDetailItem =
  UserOrderDetail["items"][number];