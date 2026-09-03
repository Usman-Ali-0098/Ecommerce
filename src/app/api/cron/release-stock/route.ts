// import { NextResponse } from "next/server";

// // import { releaseExpiredStockReservations } from "@/lib/services/payment.service";

// export const dynamic = "force-dynamic";

// export async function GET(request: Request) {
//   const cronSecret = process.env.CRON_SECRET;
//   const authorization = request.headers.get("authorization");

//   if (!cronSecret) {
//     return NextResponse.json(
//       { success: false, message: "CRON_SECRET is not configured." },
//       { status: 503 },
//     );
//   }

//   if (authorization !== `Bearer ${cronSecret}`) {
//     return NextResponse.json(
//       { success: false, message: "Unauthorized." },
//       { status: 401 },
//     );
//   }

//   const result = await releaseExpiredStockReservations();

//   return NextResponse.json({ success: true, data: result });
// }

// Keep the retired route inert while allowing Next.js to type-check the file.
export {};
