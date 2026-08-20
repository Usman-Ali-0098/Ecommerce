import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Use Auth.js sign out.",
    },
    {
      status: 410,
    },
  );
}
