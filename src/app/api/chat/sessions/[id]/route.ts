import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function extractToolNames(toolCalls: unknown): string[] {
  if (
    toolCalls &&
    typeof toolCalls === "object" &&
    "calls" in toolCalls &&
    Array.isArray((toolCalls as { calls: unknown }).calls)
  ) {
    return (toolCalls as { calls: Array<{ name?: unknown }> }).calls
      .map((call) => call.name)
      .filter((name): name is string => typeof name === "string");
  }
  return [];
}

function extractProductCards(productCards: unknown): { primary: unknown[]; related: unknown[] } {
  if (
    productCards &&
    typeof productCards === "object" &&
    "primary" in productCards &&
    Array.isArray((productCards as { primary: unknown }).primary)
  ) {
    const related =
      "related" in productCards && Array.isArray((productCards as { related: unknown }).related)
        ? (productCards as { related: unknown[] }).related
        : [];
    return { primary: (productCards as { primary: unknown[] }).primary, related };
  }
  return { primary: [], related: [] };
}

/** Loads one chat thread's full history, for switching to it from the
 * recent-chats list. Ownership-checked: an account can only ever load its
 * own threads. Replays the saved text, which tools ran (ChatMessage.toolCalls),
 * and the resolved product cards (ChatMessage.productCards) exactly as they
 * were shown live -- retrieval `sources`/similarity scores are still not
 * persisted (cosmetic footer only), so those stay live-response-only. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getUserSession();
    const admin = user ? null : await getAdminSession();
    const account = user ?? admin;

    if (!account) {
      return NextResponse.json(
        { success: false, message: "Sign in to see your chat history." },
        { status: 401 },
      );
    }

    const { id } = await params;

    const session = await prisma.chatSession.findFirst({
      where: { id, userId: account.id },
      select: { id: true, title: true },
    });

    if (!session) {
      return NextResponse.json({ success: false, message: "Chat not found." }, { status: 404 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id, role: { not: "TOOL" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, toolCalls: true, productCards: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        session: { id: session.id, title: session.title?.trim() || "New chat" },
        messages: messages.map((message) => {
          const { primary, related } = extractProductCards(message.productCards);
          return {
            id: message.id,
            role: message.role === "USER" ? "user" : "assistant",
            content: message.content,
            toolsUsed: extractToolNames(message.toolCalls),
            productCards: primary,
            relatedCards: related,
          };
        }),
      },
    });
  } catch (error) {
    console.error("Load chat session error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load that chat." },
      { status: 500 },
    );
  }
}

/** Deletes one chat thread. ChatMessage rows cascade-delete automatically
 * (onDelete: Cascade on ChatMessage.session in the schema). */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await getUserSession();
    const admin = user ? null : await getAdminSession();
    const account = user ?? admin;

    if (!account) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;

    const session = await prisma.chatSession.findFirst({
      where: { id, userId: account.id },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json({ success: false, message: "Chat not found." }, { status: 404 });
    }

    await prisma.chatSession.delete({ where: { id: session.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete chat session error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to delete that chat." },
      { status: 500 },
    );
  }
}
