"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  Bot,
  Check,
  History as HistoryIcon,
  Loader2,
  Minus,
  PackageX,
  Plus,
  Send,
  ShoppingCart,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

import ChatCheckoutPanel from "@/components/chat/chat-checkout-panel";
import type { OrderConfirmedResult, OrderFailedResult } from "@/components/payments/checkout-form";
import { notifyCartUpdated } from "@/lib/cart-events";
import { notifyNotificationUpdated } from "@/lib/notification-events";
import { cn } from "@/lib/utils";

// Gemini's replies come back markdown-formatted (**bold**, bullet lists,
// occasional ### headers) -- these overrides collapse react-markdown's
// default block spacing so it reads as compact chat-bubble text rather
// than a full article.
const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-1.5 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-1.5 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  h1: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  h3: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-[#087ff5] underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-black/5 px-1 py-0.5 text-[12px]">{children}</code>
  ),
};

type ChatSource = {
  sourceType: "PRODUCT" | "CATEGORY" | "POLICY" | "FAQ" | string;
  sourceId: string;
  similarity: number;
  slug: string | null;
};

type ProductCard = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
  imageUrl: string | null;
};

type ProductVariantOption = {
  variantId: string;
  color: string | null;
  size: string | null;
  price: number;
  inStock: boolean;
  stock: number;
};

type CartReviewItem = {
  id: string;
  product: string;
  color: string | null;
  size: string | null;
  quantity: number;
  lineTotal: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  sources?: ChatSource[];
  productCards?: ProductCard[];
  relatedCards?: ProductCard[];
  isError?: boolean;
  failedOrder?: {
    orderId: string;
    orderNumber: string | null;
    // Set once either button is clicked -- locks the card so a double
    // click (or clicking back after scrolling up) can't fire the action
    // twice or queue up duplicate follow-up messages.
    resolution?: "retry" | "later";
  };
};

type RecentChat = {
  id: string;
  title: string;
  lastActiveAt: string;
};

function formatPrice(price: number): string {
  return `Rs. ${Math.round(price).toLocaleString("en-PK")}`;
}

// Matches the 10% rate already duplicated the same way in CartSummary,
// GET /api/cart, and createOrder() -- a display-only echo of the same
// single-line constant, not a new source of truth.
const TAX_RATE = 0.1;

function groupCardsByCategory(cards: ProductCard[]): { category: string; cards: ProductCard[] }[] {
  const order: string[] = [];
  const byCategory = new Map<string, ProductCard[]>();

  for (const card of cards) {
    if (!byCategory.has(card.category)) {
      order.push(card.category);
      byCategory.set(card.category, []);
    }
    byCategory.get(card.category)!.push(card);
  }

  return order.map((category) => ({ category, cards: byCategory.get(category)! }));
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const TOOL_LABELS: Record<string, string> = {
  search_products: "the product catalog",
  get_product_variants: "available options",
  get_my_orders: "your recent orders",
  get_order_status: "that order",
  get_my_cart: "your cart",
  add_to_cart: "your cart",
  get_sales_summary: "sales data",
  get_low_stock: "stock levels",
  get_failed_payments: "payment attempts",
  search_orders: "orders",
  update_order_status: "that order",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  PRODUCT: "product",
  CATEGORY: "category",
  POLICY: "policy",
  FAQ: "FAQ",
};

const GUEST_SUGGESTIONS = [
  "Do you have any shoes?",
  "What's your return policy?",
  "How long does shipping take?",
];

const USER_SUGGESTIONS = [
  "Where's my order?",
  "What's in my cart?",
  "What's your return policy?",
];

const ADMIN_SUGGESTIONS = [
  "How are sales this week?",
  "What's running low on stock?",
  "Any failed payments recently?",
];

// Action tools did something, rather than just looking something up --
// "Checked your cart" would misdescribe add_to_cart, which changed it.
const ACTION_TOOL_PHRASES: Record<string, string> = {
  add_to_cart: "Added to your cart",
  update_order_status: "Updated that order",
};

function summarizeToolsUsed(toolsUsed: string[] | undefined): string | null {
  if (!toolsUsed || toolsUsed.length === 0) return null;

  const uniqueTools = [...new Set(toolsUsed)];
  const actionPhrases = [
    ...new Set(uniqueTools.filter((name) => ACTION_TOOL_PHRASES[name]).map((name) => ACTION_TOOL_PHRASES[name])),
  ];
  const readLabels = [
    ...new Set(uniqueTools.filter((name) => !ACTION_TOOL_PHRASES[name]).map((name) => TOOL_LABELS[name] ?? name)),
  ];

  const parts = [...actionPhrases];
  if (readLabels.length > 0) parts.push(`Checked ${readLabels.join(" and ")}`);

  return parts.length > 0 ? parts.join(" · ") : null;
}

function pluralize(word: string, count: number): string {
  if (count === 1) return word;
  return word.endsWith("y") ? `${word.slice(0, -1)}ies` : `${word}s`;
}

function summarizeSources(sources: ChatSource[] | undefined): string | null {
  if (!sources || sources.length === 0) return null;

  const counts = new Map<string, number>();
  for (const source of sources) {
    const label = SOURCE_TYPE_LABELS[source.sourceType] ?? source.sourceType.toLowerCase();
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const parts = [...counts.entries()].map(([label, count]) => `${count} ${pluralize(label, count)}`);

  return `Referenced ${parts.join(", ")}`;
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export default function ChatWidget() {
  const { data: session } = useSession();
  const role = session?.user?.role as "USER" | "ADMIN" | undefined;

  const [isOpen, setIsOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  // undefined = no thread established yet this mount (server resolves the
  // account's most recent, or creates one). A real id = pinned to that
  // thread for every message from here on, even if a newer thread exists
  // elsewhere. null = "New Chat" was clicked -- the next message forces a
  // fresh thread; collapses back to a real id once the server returns one.
  const [currentSessionId, setCurrentSessionId] = useState<string | null | undefined>(undefined);

  const [view, setView] = useState<"chat" | "history" | "checkout" | "review">("chat");
  const [recentChats, setRecentChats] = useState<RecentChat[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Cart interactivity: clicking "Add to Cart" on a card is a real, direct
  // /api/cart call, never an LLM tool call (see the plan for this feature)
  // -- variantLoadingId marks which specific card is mid-fetch,
  // variantPicker holds an open color/size chooser (only needed when a
  // product has more than one variant), cartFeedback drives the "added!"
  // banner with its Keep Shopping / Place Order choice.
  const [variantLoadingId, setVariantLoadingId] = useState<string | null>(null);
  const [variantPicker, setVariantPicker] = useState<{
    productId: string;
    productName: string;
    variants: ProductVariantOption[];
  } | null>(null);
  const [cartFeedback, setCartFeedback] = useState<{ productName: string } | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);

  // Cart items added *through this conversation* -- checkout is scoped to
  // just these, not the customer's whole real cart (see ChatCheckoutPanel).
  // resumeOrderId is set when retrying a previously failed card payment
  // from this widget, switching ChatCheckoutPanel into its resume mode.
  const [chatCartItemIds, setChatCartItemIds] = useState<string[]>([]);
  const [resumeOrderId, setResumeOrderId] = useState<string | null>(null);

  // "Place Order" opens this review first, listing everything added via
  // chat with a checkbox per row -- same select/unselect pattern the real
  // /cart page already uses (all selected by default; unselecting never
  // deletes anything, it just leaves that item out of *this* order and
  // sitting in the real cart for later). Only the checked subset is what
  // actually gets scoped into ChatCheckoutPanel.
  const [cartReview, setCartReview] = useState<CartReviewItem[] | null>(null);
  const [reviewSelectedIds, setReviewSelectedIds] = useState<string[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // The message list only exists in the DOM while view === "chat" -- coming
  // back from checkout/review remounts it fresh at scrollTop 0, so an
  // animated "smooth" scroll-to-bottom right after visibly slides the new
  // content up from the top. Only animate when a message arrives while the
  // list was already showing; jump straight to bottom on the first paint
  // after returning to this view.
  const previousViewRef = useRef(view);

  const suggestions =
    role === "ADMIN" ? ADMIN_SUGGESTIONS : role === "USER" ? USER_SUGGESTIONS : GUEST_SUGGESTIONS;

  const statusLabel =
    role === "ADMIN" ? "Admin mode" : role === "USER" ? "Signed in" : "Online";

  useEffect(() => {
    const justReturnedToChat = view === "chat" && previousViewRef.current !== "chat";
    bottomRef.current?.scrollIntoView({ behavior: justReturnedToChat ? "auto" : "smooth" });
    previousViewRef.current = view;
  }, [messages, isSending, view]);

  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      setMessages((prev) => [...prev, { id: newId(), role: "user", content: trimmed }]);
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setIsSending(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, sessionId: currentSessionId }),
        });

        const result = await response.json().catch(() => null);

        if (response.status === 429) {
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content: "You're sending messages a little too fast. Please wait a moment and try again.",
              isError: true,
            },
          ]);
          return;
        }

        if (!response.ok || !result?.success) {
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content: "Something went wrong on my end. Please try again in a moment.",
              isError: true,
            },
          ]);
          return;
        }

        setCurrentSessionId(result.data.sessionId);

        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            content: result.data.reply,
            toolsUsed: result.data.toolsUsed,
            sources: result.data.sources,
            productCards: result.data.productCards,
            relatedCards: result.data.relatedCards,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            content: "I couldn't reach the server. Check your connection and try again.",
            isError: true,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, currentSessionId],
  );

  function handleTextareaInput(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(event.target.value);
    const el = event.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function handleOpen() {
    setIsOpen(true);
    setHasOpenedOnce(true);
  }

  function startNewChat() {
    setMessages([]);
    setCurrentSessionId(null);
    setView("chat");
    setPendingDeleteId(null);
    setInput("");
    setChatCartItemIds([]);
    setResumeOrderId(null);
    setCartReview(null);
    setReviewSelectedIds([]);
  }

  const loadRecentChats = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch("/api/chat/sessions");
      const result = await response.json().catch(() => null);
      setRecentChats(response.ok && result?.success ? result.data.sessions : []);
    } catch {
      setRecentChats([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  function toggleHistory() {
    if (view === "history") {
      setView("chat");
      return;
    }
    setPendingDeleteId(null);
    setView("history");
    void loadRecentChats();
  }

  async function loadThread(id: string) {
    setIsLoadingThread(true);
    try {
      const response = await fetch(`/api/chat/sessions/${id}`);
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        return;
      }

      setMessages(
        result.data.messages.map((entry: { id: string; role: "user" | "assistant"; content: string; toolsUsed: string[] }) => ({
          id: entry.id,
          role: entry.role,
          content: entry.content,
          toolsUsed: entry.toolsUsed,
        })),
      );
      setCurrentSessionId(id);
      setView("chat");
      setChatCartItemIds([]);
      setResumeOrderId(null);
      setCartReview(null);
      setReviewSelectedIds([]);
    } finally {
      setIsLoadingThread(false);
    }
  }

  async function deleteThread(id: string) {
    setPendingDeleteId(null);
    setRecentChats((prev) => (prev ? prev.filter((chat) => chat.id !== id) : prev));

    if (id === currentSessionId) {
      setMessages([]);
      setCurrentSessionId(null);
    }

    await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function addVariantToCart(variantId: string, productName: string, quantity: number) {
    setCartError(null);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setCartError(result?.message ?? "Unable to add that item to your cart.");
        return;
      }

      const addedCartItemId: string | undefined = result?.data?.cartItem?.id;
      if (addedCartItemId) {
        setChatCartItemIds((prev) => (prev.includes(addedCartItemId) ? prev : [...prev, addedCartItemId]));
      }

      setVariantPicker(null);
      setCartFeedback({ productName });
      notifyCartUpdated();
    } catch {
      setCartError("Unable to add that item to your cart.");
    }
  }

  async function handleAddToCartClick(card: ProductCard) {
    setCartError(null);
    setVariantLoadingId(card.id);
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(card.slug)}/variants`);
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setCartError("Unable to load options for that product.");
        return;
      }

      const variants: ProductVariantOption[] = result.data.variants;
      const purchasable = variants.filter((variant) => variant.inStock);

      if (purchasable.length === 0) {
        setCartError("That item is currently out of stock.");
        return;
      }

      // Always opens the picker, even for a single-variant product -- it
      // always asks for a quantity now, not just color/size when there's a
      // choice to make.
      setVariantPicker({ productId: card.id, productName: card.name, variants: purchasable });
    } finally {
      setVariantLoadingId(null);
    }
  }

  // "Place Order" opens this review instead of jumping straight into
  // checkout -- lists everything added via chat so far with a checkbox per
  // row, all checked by default. Fetches through the same scoped GET
  // /api/cart?itemIds=... ChatCheckoutPanel itself uses, so the review and
  // the eventual checkout total are always reading the same numbers.
  async function openCartReview() {
    setCartFeedback(null);
    setResumeOrderId(null);
    setReviewError(null);
    setCartReview(null);
    setView("review");

    if (chatCartItemIds.length === 0) {
      return;
    }

    setReviewLoading(true);
    try {
      const query = chatCartItemIds.map(encodeURIComponent).join(",");
      const response = await fetch(`/api/cart?itemIds=${query}`);
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setReviewError(result?.message ?? "Unable to load your cart.");
        return;
      }

      const items: CartReviewItem[] = result.data.items;
      setCartReview(items);
      setReviewSelectedIds(items.map((item) => item.id));
    } catch {
      setReviewError("Unable to load your cart.");
    } finally {
      setReviewLoading(false);
    }
  }

  function toggleReviewItem(itemId: string) {
    setReviewSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  }

  function toggleAllReviewItems() {
    if (!cartReview) return;
    setReviewSelectedIds((prev) => (prev.length === cartReview.length ? [] : cartReview.map((item) => item.id)));
  }

  function continueFromReview() {
    setResumeOrderId(null);
    setView("checkout");
  }

  // No navigation here on purpose -- see chat-checkout-panel.tsx for why.
  // The order already exists for real (CheckoutForm only calls this after
  // the backend confirmed it); this just decides how the outcome is shown.
  function handleOrderConfirmed(result: OrderConfirmedResult) {
    setView("chat");
    setResumeOrderId(null);
    setChatCartItemIds([]);
    setCartReview(null);
    setReviewSelectedIds([]);
    notifyCartUpdated();
    notifyNotificationUpdated();

    const methodLine =
      result.paymentMethod === "CASH_ON_DELIVERY"
        ? "You'll pay when it arrives."
        : "Payment confirmed.";
    const amountLine =
      typeof result.amount === "number" ? `\n\n**Total:** ${formatPrice(result.amount)}` : "";

    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: "assistant",
        content: `Order placed! **${result.orderNumber}**${amountLine}\n\n${methodLine} You can track it anytime under Order History.`,
      },
    ]);
  }

  // Same "don't fight the widget's own container" reasoning as
  // handleOrderConfirmed, but for a failed card payment -- see
  // chat-checkout-panel.tsx's doc comment for why PaymentFailedModal
  // doesn't render right embedded here. The order itself is untouched
  // (still sitting there, retryable) -- this only decides how the
  // failure is shown and offers a way back into it.
  function handleOrderFailed(failure: OrderFailedResult) {
    setView("chat");
    setResumeOrderId(null);
    // createOrder() removes the cart items the moment the order is placed,
    // before payment is even attempted -- so they're already gone from the
    // cart at this point regardless of how the payment itself turns out.
    // Without this, the header badge keeps showing the pre-order count.
    notifyCartUpdated();

    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: "assistant",
        content: failure.message,
        failedOrder: { orderId: failure.orderId, orderNumber: failure.orderNumber },
      },
    ]);
  }

  // Handles both PaymentRequiredCard buttons. Marks that specific
  // message's card resolved first (locking it -- see the type comment on
  // ChatMessage.failedOrder) and bails out if it's already resolved, so a
  // double click (or clicking again after scrolling back up) can't retry
  // twice or queue up duplicate "I'll retry later" follow-ups.
  function resolveFailedPayment(messageId: string, orderId: string, action: "retry" | "later") {
    let alreadyResolved = false;
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId || !message.failedOrder) return message;
        if (message.failedOrder.resolution) {
          alreadyResolved = true;
          return message;
        }
        return { ...message, failedOrder: { ...message.failedOrder, resolution: action } };
      }),
    );

    if (alreadyResolved) return;

    if (action === "retry") {
      setCartFeedback(null);
      setResumeOrderId(orderId);
      setView("checkout");
      return;
    }

    // "I'll retry later" stays in the widget instead of navigating away --
    // just acknowledges it and hands the conversation back, same as any
    // other assistant turn.
    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: "assistant",
        content:
          "No problem — your order is saved, and you can retry the payment anytime from your order's details page. What else can I help you with?",
      },
    ]);
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end">
      <div
        ref={panelRef}
        className={cn(
          "mb-3 flex w-[380px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all duration-200 ease-out",
          isOpen
            ? "pointer-events-auto h-[560px] max-h-[75vh] translate-y-0 scale-100 opacity-100"
            : "pointer-events-none h-0 translate-y-2 scale-95 opacity-0",
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex shrink-0 items-center justify-between bg-[#242424] px-4 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1">
              <Image src="/bv-mark.png" alt="Budget Vibe" fill sizes="32px" className="object-contain" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Budget Vibe Assistant</p>
              <p className="flex items-center gap-1 text-[11px] leading-tight text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {statusLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={startNewChat}
              aria-label="New chat"
              title="New chat"
              className="rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <SquarePen className="h-4 w-4" />
            </button>
            {role && (
              <button
                type="button"
                onClick={toggleHistory}
                aria-label="Recent chats"
                title="Recent chats"
                className={cn(
                  "rounded-full p-1.5 transition hover:bg-white/15 hover:text-white",
                  view === "history" ? "bg-white/15 text-white" : "text-white/80",
                )}
              >
                <HistoryIcon className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {view === "history" ? (
          <RecentChatsView
            chats={recentChats}
            isLoading={isLoadingHistory}
            isLoadingThread={isLoadingThread}
            pendingDeleteId={pendingDeleteId}
            onSelect={loadThread}
            onRequestDelete={setPendingDeleteId}
            onCancelDelete={() => setPendingDeleteId(null)}
            onConfirmDelete={deleteThread}
          />
        ) : view === "review" ? (
          <CartReviewPanel
            items={cartReview}
            selectedIds={reviewSelectedIds}
            loading={reviewLoading}
            error={reviewError}
            onToggle={toggleReviewItem}
            onToggleAll={toggleAllReviewItems}
            onBack={() => setView("chat")}
            onContinue={continueFromReview}
          />
        ) : view === "checkout" ? (
          <ChatCheckoutPanel
            onBack={() => {
              setView("chat");
              setResumeOrderId(null);
            }}
            onOrderConfirmed={handleOrderConfirmed}
            onOrderFailed={handleOrderFailed}
            chatCartItemIds={resumeOrderId ? [] : reviewSelectedIds}
            resumeOrderId={resumeOrderId}
          />
        ) : (
          <>
        <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <AssistantBubble>
                Hi! I&apos;m the Budget Vibe assistant. Ask me about products, orders, or store
                policies.
              </AssistantBubble>
              <div className="flex flex-wrap gap-1.5 pl-8">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    className="rounded-full border border-[#087ff5]/25 bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#087ff5] transition hover:bg-[#087ff5]/5"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-[#087ff5] px-3 py-2 text-[13.5px] leading-relaxed text-white">
                {message.content}
              </div>
            ) : (
              <div key={message.id} className="space-y-1">
                {message.failedOrder ? (
                  <PaymentRequiredCard
                    reason={message.content}
                    orderNumber={message.failedOrder.orderNumber}
                    resolution={message.failedOrder.resolution}
                    onRetry={() => resolveFailedPayment(message.id, message.failedOrder!.orderId, "retry")}
                    onDismiss={() => resolveFailedPayment(message.id, message.failedOrder!.orderId, "later")}
                  />
                ) : (
                  <AssistantBubble isError={message.isError}>{message.content}</AssistantBubble>
                )}
                {(summarizeToolsUsed(message.toolsUsed) || summarizeSources(message.sources)) && (
                  <p className="pl-8 text-[10.5px] leading-tight text-gray-400">
                    {[summarizeToolsUsed(message.toolsUsed), summarizeSources(message.sources)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {message.productCards && message.productCards.length > 0 && (
                  <ProductCardRow
                    cards={message.productCards}
                    canAddToCart={role === "USER"}
                    loadingId={variantLoadingId}
                    onAddClick={(card) => void handleAddToCartClick(card)}
                  />
                )}
                {message.relatedCards && message.relatedCards.length > 0 && (
                  <div className="space-y-2">
                    {groupCardsByCategory(message.relatedCards).map((group) => (
                      <div key={group.category} className="space-y-1">
                        <p className="pl-8 text-[10.5px] font-medium text-gray-400">
                          Related {group.category} products
                        </p>
                        <ProductCardRow
                          cards={group.cards}
                          canAddToCart={role === "USER"}
                          loadingId={variantLoadingId}
                          onAddClick={(card) => void handleAddToCartClick(card)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}

          {isSending && (
            <div className="flex items-center gap-2 pl-1">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#087ff5]/10 text-[#087ff5]">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <span className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-3 py-2.5">
                <TypingDot delay="0ms" />
                <TypingDot delay="120ms" />
                <TypingDot delay="240ms" />
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {cartError && (
          <div className="shrink-0 border-t border-red-100 bg-red-50 px-3 py-2 text-[11.5px] text-red-700">
            {cartError}
          </div>
        )}

        {variantPicker && (
          <VariantPickerPanel
            productName={variantPicker.productName}
            variants={variantPicker.variants}
            onCancel={() => setVariantPicker(null)}
            onAdd={(variantId, quantity) =>
              void addVariantToCart(variantId, variantPicker.productName, quantity)
            }
          />
        )}

        {cartFeedback && (
          <div className="shrink-0 border-t border-gray-200 bg-white p-3">
            <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-gray-800">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              {cartFeedback.productName} added to your cart
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setCartFeedback(null)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Keep Shopping
              </button>
              <button
                type="button"
                onClick={() => void openCartReview()}
                className="flex-1 rounded-lg bg-[#087ff5] px-3 py-2 text-[12px] font-medium text-white transition hover:bg-[#066ed6]"
              >
                Place Order
              </button>
            </div>
          </div>
        )}

        <div className="flex shrink-0 items-end gap-2 border-t border-gray-200 bg-white p-2.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask something..."
            aria-label="Message"
            className="max-h-24 flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-[13.5px] leading-snug text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#087ff5] focus:ring-1 focus:ring-[#087ff5]"
          />
          <button
            type="button"
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || isSending}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#087ff5] text-white transition hover:bg-[#066ed6] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        aria-label={isOpen ? "Close chat" : "Open chat"}
        className="pointer-events-auto relative flex items-center justify-center rounded-full bg-[#087ff5] text-white shadow-lg transition hover:bg-[#066ed6] hover:shadow-xl"
        style={{ height: "3.25rem", width: "3.25rem" }}
      >
        {!hasOpenedOnce && (
          <span className="absolute inset-0 rounded-full bg-[#087ff5] opacity-75 animate-ping" />
        )}
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1.5">
            <Image src="/bv-mark.png" alt="Budget Vibe" fill sizes="36px" className="object-contain" />
          </span>
        )}
      </button>
    </div>
  );
}

// The real order-detail page shows a stuck-unpaid order in an amber
// "Payment required" section (see src/app/orders/[id]/page.tsx), distinct
// from a hard red error -- the order itself is fine, saved, and waiting.
// This mirrors that same visual language in chat instead of a plain
// error bubble, with explicit next steps rather than just the failure
// reason.
function PaymentRequiredCard({
  reason,
  orderNumber,
  resolution,
  onRetry,
  onDismiss,
}: {
  reason: string;
  orderNumber: string | null;
  resolution?: "retry" | "later";
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const resolved = Boolean(resolution);

  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <Bot className="h-3.5 w-3.5" />
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-amber-200 bg-amber-50 px-3 py-2.5">
        <p className="text-[13px] font-semibold text-amber-900">Payment required</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-amber-800">{reason}</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-amber-800">
          Your order{" "}
          {orderNumber ? <span className="font-semibold">{orderNumber}</span> : null} has been
          saved to your Order History — nothing is lost. Retry the payment now, or anytime later
          from the order&apos;s details page.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={resolved}
            className="rounded-lg bg-[#087ff5] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[#066ed6] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Retry payment now
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={resolved}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            I&apos;ll retry later
          </button>
        </div>
        {resolved && (
          <p className="mt-2 text-[11.5px] font-medium text-amber-700">
            You selected: {resolution === "retry" ? "Retry payment now" : "I'll retry later"}
          </p>
        )}
      </div>
    </div>
  );
}

function AssistantBubble({
  children,
  isError,
}: {
  children: string;
  isError?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#087ff5]/10 text-[#087ff5]">
        <Bot className="h-3.5 w-3.5" />
      </span>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl rounded-bl-sm border px-3 py-2 text-[13.5px] leading-relaxed",
          isError
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-gray-200 bg-white text-gray-800",
        )}
      >
        <ReactMarkdown components={MARKDOWN_COMPONENTS}>{children}</ReactMarkdown>
      </div>
    </div>
  );
}

function TypingDot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
      style={{ animationDelay: delay }}
    />
  );
}

function RecentChatsView({
  chats,
  isLoading,
  isLoadingThread,
  pendingDeleteId,
  onSelect,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  chats: RecentChat[] | null;
  isLoading: boolean;
  isLoadingThread: boolean;
  pendingDeleteId: string | null;
  onSelect: (id: string) => void;
  onRequestDelete: (id: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 px-3 py-3">
      <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
        Recent chats
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8 text-gray-300">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !chats || chats.length === 0 ? (
        <p className="px-1 py-6 text-center text-[12.5px] text-gray-400">No chats yet.</p>
      ) : (
        <div className="space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className="flex items-center gap-2 rounded-xl border border-transparent bg-white px-2.5 py-2 shadow-sm transition hover:border-gray-200"
            >
              {pendingDeleteId === chat.id ? (
                <div className="flex flex-1 items-center justify-between gap-2">
                  <span className="text-[12px] text-gray-600">Delete this chat?</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onConfirmDelete(chat.id)}
                      className="rounded-lg bg-red-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-600"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={onCancelDelete}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelect(chat.id)}
                    disabled={isLoadingThread}
                    className="min-w-0 flex-1 text-left disabled:opacity-50"
                  >
                    <span className="block truncate text-[12.5px] font-medium text-gray-800">
                      {chat.title}
                    </span>
                    <span className="text-[10.5px] text-gray-400">
                      {formatRelativeTime(chat.lastActiveAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestDelete(chat.id)}
                    aria-label="Delete chat"
                    className="shrink-0 rounded-lg p-1.5 text-gray-300 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCardRow({
  cards,
  canAddToCart,
  loadingId,
  onAddClick,
}: {
  cards: ProductCard[];
  canAddToCart: boolean;
  loadingId: string | null;
  onAddClick: (card: ProductCard) => void;
}) {
  return (
    <div className="ml-8 flex gap-2 overflow-x-auto pb-1 pr-1">
      {cards.map((card) => (
        <div
          key={card.id}
          className="flex w-[104px] shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white"
        >
          <div className="relative h-[72px] w-full bg-gray-100">
            {card.imageUrl ? (
              <Image
                src={card.imageUrl}
                alt={card.name}
                fill
                sizes="104px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <PackageX className="h-5 w-5" />
              </div>
            )}
            {!card.inStock && (
              <span className="absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[8.5px] font-medium leading-none text-white">
                Out of stock
              </span>
            )}
          </div>
          <div className="p-1.5">
            <p className="line-clamp-2 text-[11px] font-medium leading-tight text-gray-800">
              {card.name}
            </p>
            <div className="mt-0.5 flex items-center justify-between gap-1">
              <p className="text-[11px] font-semibold text-[#087ff5]">{formatPrice(card.price)}</p>
              {canAddToCart && card.inStock && (
                <button
                  type="button"
                  onClick={() => onAddClick(card)}
                  disabled={loadingId === card.id}
                  aria-label={`Add ${card.name} to cart`}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#087ff5]/10 text-[#087ff5] transition hover:bg-[#087ff5]/20 disabled:opacity-50"
                >
                  {loadingId === card.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function VariantPickerPanel({
  productName,
  variants,
  onCancel,
  onAdd,
}: {
  productName: string;
  variants: ProductVariantOption[];
  onCancel: () => void;
  onAdd: (variantId: string, quantity: number) => void;
}) {
  const colors = [...new Set(variants.map((v) => v.color).filter((v): v is string => Boolean(v)))];
  const sizes = [...new Set(variants.map((v) => v.size).filter((v): v is string => Boolean(v)))];

  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] ?? null);
  const [selectedSize, setSelectedSize] = useState<string | null>(sizes[0] ?? null);
  const [quantity, setQuantity] = useState(1);

  const matched = variants.find(
    (v) => (colors.length === 0 || v.color === selectedColor) && (sizes.length === 0 || v.size === selectedSize),
  );

  // Different color/size can mean a different stock cap -- clamp at read
  // time rather than resetting state in an effect, so switching to a
  // lower-stock option never briefly shows an over-limit quantity.
  const effectiveQuantity = matched ? Math.min(quantity, matched.stock) : quantity;

  return (
    <div className="shrink-0 border-t border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12.5px] font-semibold text-gray-800">{productName}</p>
        <button type="button" onClick={onCancel} aria-label="Cancel" className="text-gray-400 hover:text-gray-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {colors.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">Color</p>
          <div className="flex flex-wrap gap-1.5">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                  selectedColor === color
                    ? "border-[#087ff5] bg-[#087ff5]/10 text-[#087ff5]"
                    : "border-gray-200 text-gray-600 hover:border-gray-300",
                )}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">Size</p>
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                  selectedSize === size
                    ? "border-[#087ff5] bg-[#087ff5]/10 text-[#087ff5]"
                    : "border-gray-200 text-gray-600 hover:border-gray-300",
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">Quantity</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-5 text-center text-[13px] font-medium text-gray-800">{effectiveQuantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            disabled={!matched || effectiveQuantity >= matched.stock}
            aria-label="Increase quantity"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
          </button>
          {matched && (
            <span className="text-[10.5px] text-gray-400">{matched.stock} available</span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => matched && onAdd(matched.variantId, effectiveQuantity)}
        disabled={!matched}
        className="mt-1 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#087ff5] text-[12.5px] font-medium text-white transition hover:bg-[#066ed6] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ShoppingCart className="h-3.5 w-3.5" />
        {matched ? `Add to Cart · ${formatPrice(matched.price * effectiveQuantity)}` : "Select an option"}
      </button>
    </div>
  );
}

// Mirrors the real /cart page's own select/unselect pattern (checkbox per
// row, all checked by default) rather than a destructive remove -- an
// unchecked item just sits out of *this* order, still in the real cart.
function CartReviewPanel({
  items,
  selectedIds,
  loading,
  error,
  onToggle,
  onToggleAll,
  onBack,
  onContinue,
}: {
  items: CartReviewItem[] | null;
  selectedIds: string[];
  loading: boolean;
  error: string | null;
  onToggle: (itemId: string) => void;
  onToggleAll: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const allSelected = items !== null && items.length > 0 && selectedIds.length === items.length;
  // Matches CartSummary's own math (10% of subtotal) so this preview never
  // disagrees with what checkout actually charges a moment later.
  const selectedSubtotal = Math.round(
    (items ?? [])
      .filter((item) => selectedIds.includes(item.id))
      .reduce((sum, item) => sum + item.lineTotal, 0),
  );
  const selectedTax = Math.round(selectedSubtotal * TAX_RATE);
  const selectedGrandTotal = selectedSubtotal + selectedTax;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 text-[11.5px] font-medium text-[#087ff5] hover:underline"
      >
        &larr; Back to chat
      </button>

      {loading ? (
        <div className="flex justify-center py-10 text-gray-300">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error || !items || items.length === 0 ? (
        <p className="px-1 py-6 text-center text-[12.5px] text-gray-500">
          {error ?? "Nothing to review yet."}
        </p>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-[13.5px] font-semibold text-gray-900">Review your order</h2>
            <button
              type="button"
              onClick={onToggleAll}
              className="text-[11.5px] font-medium text-[#087ff5] hover:underline"
            >
              {allSelected ? "Unselect all" : "Select all"}
            </button>
          </div>

          <div className="space-y-2.5">
            {items.map((item) => {
              const checked = selectedIds.includes(item.id);
              return (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-100 p-2.5 transition hover:border-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(item.id)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#087ff5]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-gray-800">{item.product}</p>
                    <p className="mt-0.5 text-[10.5px] text-gray-400">
                      {[item.color, item.size, `Qty ${item.quantity}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="shrink-0 text-[12.5px] font-semibold text-gray-800">
                    {formatPrice(item.lineTotal)}
                  </p>
                </label>
              );
            })}
          </div>

          <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 text-[12.5px]">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-700">{formatPrice(selectedSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Tax</span>
              <span className="text-gray-700">{formatPrice(selectedTax)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-1.5">
              <span className="font-medium text-gray-800">Total</span>
              <span className="font-semibold text-gray-900">{formatPrice(selectedGrandTotal)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onContinue}
            disabled={selectedIds.length === 0}
            className="mt-3 h-10 w-full rounded-lg bg-[#087ff5] text-[12.5px] font-medium text-white transition hover:bg-[#066ed6] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {selectedIds.length === 0 ? "Select at least one item" : "Continue to checkout"}
          </button>
        </div>
      )}
    </div>
  );
}
