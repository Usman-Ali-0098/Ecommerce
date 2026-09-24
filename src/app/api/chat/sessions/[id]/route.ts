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

/** Loads one chat thread's full history, for switching to it from the
 * recent-chats list. Ownership-checked: an account can only ever load its
 * own threads. Note: this replays the saved text and which tools ran
 * (persisted on ChatMessage.toolCalls), but not the product-card /
 * retrieved-sources detail shown live in the moment -- that was never
 * persisted, only computed per-response, so reloaded history is text +
 * tool-usage only. A reasonable fidelity trade-off rather than adding new
 * persistence just for a cosmetic footer on old messages. */
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
      select: { id: true, role: true, content: true, toolCalls: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        session: { id: session.id, title: session.title?.trim() || "New chat" },
        messages: messages.map((message) => ({
          id: message.id,
          role: message.role === "USER" ? "user" : "assistant",
          content: message.content,
          toolsUsed: extractToolNames(message.toolCalls),
        })),
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
