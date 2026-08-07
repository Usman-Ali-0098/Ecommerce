import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

import CartSummary from "@/components/cart/cart-summary";
import CartTable from "@/components/cart/cart-table";
import SiteHeader from "@/components/layout/site-header";

import { getUserCart } from "@/lib/services/cart.service";
import CartClient from "@/components/cart/cart-client";

export default async function CartPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = Number(
    session.user.id
  );

  if (!Number.isInteger(userId)) {
    redirect("/login");
  }

  const cart =
    await getUserCart(userId);

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-[#f7f9fb] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[1500px]">
          <div className="mb-8 flex items-center gap-3">
            <Link
              href="/"
              aria-label="Back to products"
              className="text-xl text-[#087ff5] transition hover:opacity-70"
            >
              ←
            </Link>

            <h1 className="text-2xl font-medium text-[#087ff5]">
              Your Shopping Bag
            </h1>
          </div>

          {cart.items.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-white px-6 py-16 text-center">
              <p className="text-lg font-medium text-gray-800">
                Your shopping bag is empty
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Add some products to your cart first.
              </p>

              <Link
                href="/"
                className="mt-6 inline-flex h-10 items-center rounded-md bg-[#087ff5] px-5 text-sm font-medium text-white hover:bg-[#066ed6]"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <>
              <CartClient cart={cart} />
            </>
          )}
        </div>
      </main>
    </>
  );
}