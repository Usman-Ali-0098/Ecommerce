"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";
import { CheckoutElementsProvider, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";

import Alert from "@/components/ui/alert";

type Shipping = { shippingName: string; shippingEmail: string; shippingPhone: string; shippingAddress: string; shippingCity: string; shippingPostalCode: string; shippingCountry: string };
type CardCheckout = { clientSecret: string; publishableKey: string };
type Props = { orderId: string; orderNumber: string; shipping: Shipping };

function CardForm({ onError }: { onError: (message: string) => void }) {
  const result = useCheckoutElements();
  const [paying, setPaying] = useState(false);
  async function pay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (result.type !== "success" || !result.checkout.canConfirm) return;
    try {
      setPaying(true);
      const confirmation = await result.checkout.confirm();
      if (confirmation.type === "error") onError(confirmation.error.message ?? "Payment could not be completed.");
    } catch (error) {
      console.error("Stripe confirmation error:", error);
      onError("Payment could not be completed. Please try again.");
    } finally { setPaying(false); }
  }
  if (result.type === "loading") return <p className="mt-4 text-center text-sm text-gray-500">Loading secure payment form...</p>;
  if (result.type === "error") return <Alert message="Unable to load the secure payment form." variant="error" />;
  return <form onSubmit={pay} className="mt-4 space-y-4"><div className="rounded-lg border border-gray-200 p-4"><PaymentElement options={{ layout: "accordion", fields: { billingDetails: { name: "never", email: "never", phone: "never", address: "never" } } }} /></div><button type="submit" disabled={!result.checkout.canConfirm || paying} className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-gray-300">{paying ? "Processing payment..." : "Pay securely"}</button></form>;
}

function CardPayment({ data, onError }: { data: CardCheckout; onError: (message: string) => void }) {
  const stripe = useMemo(() => loadStripe(data.publishableKey), [data.publishableKey]);
  return <CheckoutElementsProvider stripe={stripe} options={{ clientSecret: data.clientSecret, elementsOptions: { appearance: { theme: "stripe", variables: { colorPrimary: "#087ff5", borderRadius: "8px" } } } }}><CardForm onError={onError} /></CheckoutElementsProvider>;
}

export default function CheckoutForm({ orderId, shipping: initialShipping }: Props) {
  const router = useRouter();
  const [shipping, setShipping] = useState(initialShipping);
  const [step, setStep] = useState<"delivery" | "payment">("delivery");
  const [choice, setChoice] = useState<"card" | "cod" | null>(null);
  const [card, setCard] = useState<CardCheckout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (field: keyof Shipping, value: string) => setShipping((current) => ({ ...current, [field]: value }));
  async function saveDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/shipping-address`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(shipping) });
      const body = await response.json() as { success: boolean; message?: string };
      if (!response.ok || !body.success) { setError(body.message ?? "Check your delivery details."); return; }
      setStep("payment");
    } catch { setError("Unable to save delivery details. Please try again."); } finally { setBusy(false); }
  }
  async function selectCard() {
    setChoice("card"); setError(null); if (card || busy) return; setBusy(true);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/stripe-checkout`, { method: "POST" });
      const body = await response.json() as { success: boolean; message?: string; data?: CardCheckout };
      if (!response.ok || !body.success || !body.data) { setError(body.message ?? "Unable to load card payment."); return; }
      setCard(body.data);
    } catch { setError("Unable to load card payment. Please try again."); } finally { setBusy(false); }
  }
  async function placeCod() {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/stripe/cash-on-delivery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
      const body = await response.json() as { success: boolean; message?: string; data?: { orderId: string } };
      if (!response.ok || !body.success || !body.data) { setError(body.message ?? "Unable to place cash on delivery order."); return; }
      router.push(`/payment/cash-on-delivery?order_id=${encodeURIComponent(body.data.orderId)}`); router.refresh();
    } catch { setError("Unable to place cash on delivery order. Please try again."); } finally { setBusy(false); }
  }
  return <>{step === "delivery" ? <form onSubmit={saveDelivery} className="space-y-5"><div><h2 className="text-base font-semibold text-gray-900">Contact & delivery</h2><p className="mt-1 text-xs text-gray-500">Enter the details we should use for this order.</p></div><fieldset className="rounded-lg border border-gray-200 bg-white p-4"><div className="grid gap-3 sm:grid-cols-2"><Input label="Full name" value={shipping.shippingName} onChange={(v) => update("shippingName", v)} autoComplete="name" /><Input label="Email" value={shipping.shippingEmail} onChange={(v) => update("shippingEmail", v)} autoComplete="email" type="email" /><Input label="Phone" value={shipping.shippingPhone} onChange={(v) => update("shippingPhone", v)} autoComplete="tel" /><div className="sm:col-span-2"><Input label="Address" value={shipping.shippingAddress} onChange={(v) => update("shippingAddress", v)} autoComplete="street-address" /></div><Input label="City" value={shipping.shippingCity} onChange={(v) => update("shippingCity", v)} autoComplete="address-level2" /><Input label="Postal code" value={shipping.shippingPostalCode} onChange={(v) => update("shippingPostalCode", v)} autoComplete="postal-code" /></div></fieldset>{error && <Alert message={error} variant="error" />}<button disabled={busy} className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-gray-300">{busy ? "Saving details..." : "Continue to payment"}</button></form> : <div className="space-y-5"><div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-xs"><div><p className="font-semibold">{shipping.shippingName}</p><p className="text-gray-500">{shipping.shippingAddress}, {shipping.shippingCity} {shipping.shippingPostalCode}</p></div><button type="button" onClick={() => setStep("delivery")} className="font-semibold text-blue-600">Edit</button></div><div className="border-t pt-5"><h2 className="text-base font-semibold text-gray-900">Choose payment method</h2><div className="mt-3 grid grid-cols-2 gap-3"><Choice selected={choice === "cod"} title="Cash on delivery" description="Pay when your order arrives" onClick={() => setChoice("cod")} /><Choice selected={choice === "card"} title="Credit / debit card" description="Pay securely with Stripe" onClick={selectCard} /></div>{error && <div className="mt-4"><Alert message={error} variant="error" /></div>}{choice === "cod" && <button type="button" onClick={placeCod} disabled={busy} className="mt-4 h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-gray-300">{busy ? "Placing order..." : "Place cash on delivery order"}</button>}{choice === "card" && card && <CardPayment data={card} onError={setError} />}{choice === "card" && busy && !card && <p className="mt-4 text-center text-sm text-gray-500">Loading secure payment form...</p>}</div></div>}<p className="mt-5 text-center text-[11px] text-gray-400">Sandbox mode. No real payment will be taken.</p></>;
}

function Choice({ selected, title, description, onClick }: { selected: boolean; title: string; description: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={`rounded-lg border p-3 text-left ${selected ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 bg-white"}`}><span className="text-xs font-semibold text-gray-900">{title}</span><span className="mt-1 block text-[10px] text-gray-500">{description}</span></button>; }
function Input({ label, value, onChange, autoComplete, type = "text" }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string; type?: "text" | "email" }) { return <label className="block text-xs font-medium text-gray-600">{label} <span className="text-red-500">*</span><input type={type} required value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm" /></label>; }
