import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Role is resolved by the authenticated session.",
    },
    {
      status: 410,
    },
  );
}
