import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  auth,
} from "@/auth";

import CartClient from "@/components/cart/cart-client";
import SiteHeader from "@/components/layout/site-header";

import {
  getUserCart,
} from "@/lib/services/cart.service";

export default async function CartPage() {
  const session =
    await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId =
    Number(
      session.user.id
    );

  if (
    !Number.isInteger(
      userId
    )
  ) {
    redirect("/login");
  }

  const cart =
    await getUserCart(
      userId
    );

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-[#f7f9fb] px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[1500px]">
          {/* Heading */}

          <div className="mb-5 flex items-center gap-2.5">
            <Link
              href="/"
              aria-label="Back to products"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#087ff5] transition hover:bg-blue-50"
            >
              <span className="text-lg">
                ←
              </span>
            </Link>

            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
                Your Shopping Bag
              </h1>

              <p className="mt-0.5 text-xs text-gray-500">
                Review your selected items before placing an order.
              </p>
            </div>
          </div>

          {cart.items.length ===
          0 ? (
            <div className="rounded-lg border border-gray-200 bg-white px-6 py-14 text-center">
              <p className="text-sm font-semibold text-gray-800">
                Your shopping bag is empty
              </p>

              <p className="mt-1.5 text-xs text-gray-500">
                Add some products to your cart first.
              </p>

              <Link
                href="/"
                className="mt-5 inline-flex h-9 items-center rounded-md bg-[#087ff5] px-4 text-xs font-semibold text-white transition hover:bg-[#066ed6]"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <CartClient
              cart={cart}
            />
          )}
        </div>
      </main>
    </>
  );
}