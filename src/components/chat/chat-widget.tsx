"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  Bot,
  History as HistoryIcon,
  Loader2,
  PackageX,
  Send,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

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

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  sources?: ChatSource[];
  productCards?: ProductCard[];
  isError?: boolean;
};

type RecentChat = {
  id: string;
  title: string;
  lastActiveAt: string;
};

function formatPrice(price: number): string {
  return `Rs. ${Math.round(price).toLocaleString("en-PK")}`;
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

  const [view, setView] = useState<"chat" | "history">("chat");
  const [recentChats, setRecentChats] = useState<RecentChat[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions =
    role === "ADMIN" ? ADMIN_SUGGESTIONS : role === "USER" ? USER_SUGGESTIONS : GUEST_SUGGESTIONS;

  const statusLabel =
    role === "ADMIN" ? "Admin mode" : role === "USER" ? "Signed in" : "Online";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

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
                <AssistantBubble isError={message.isError}>{message.content}</AssistantBubble>
                {(summarizeToolsUsed(message.toolsUsed) || summarizeSources(message.sources)) && (
                  <p className="pl-8 text-[10.5px] leading-tight text-gray-400">
                    {[summarizeToolsUsed(message.toolsUsed), summarizeSources(message.sources)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {message.productCards && message.productCards.length > 0 && (
                  <ProductCardRow cards={message.productCards} />
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

function ProductCardRow({ cards }: { cards: ProductCard[] }) {
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
            <p className="mt-0.5 text-[11px] font-semibold text-[#087ff5]">
              {formatPrice(card.price)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
