import { NextResponse } from "next/server";

// Orders must be created only after shipping details are saved and the user
// explicitly starts the final payment action. Use /api/checkout/:id/... .
export async function POST() {
  return NextResponse.json(
    { success: false, message: "This checkout endpoint has been replaced. Start from the cart checkout flow." },
    { status: 410 },
  );
}
