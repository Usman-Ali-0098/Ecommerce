import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-auth";

const RECENT_SESSIONS_LIMIT = 30;

/** Lists the signed-in account's recent chat threads, for the "recent
 * chats" list -- guests get 401. Guests have no stable identity across
 * browser restarts/devices for a history list to attach to (same reason
 * ChatGPT itself doesn't offer chat history to signed-out users), and
 * that's a deliberate scope boundary, not an oversight. */
export async function GET() {
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

    const sessions = await prisma.chatSession.findMany({
      where: { userId: account.id },
      orderBy: { lastActiveAt: "desc" },
      take: RECENT_SESSIONS_LIMIT,
      select: { id: true, title: true, lastActiveAt: true, createdAt: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessions.map((session) => ({
          id: session.id,
          title: session.title?.trim() || "New chat",
          lastActiveAt: session.lastActiveAt,
          createdAt: session.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("List chat sessions error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load chat history." },
      { status: 500 },
    );
  }
}
