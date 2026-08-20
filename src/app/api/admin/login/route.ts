import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Use the shared login page.",
    },
    {
      status: 410,
    },
  );
}
