// import { NextResponse } from "next/server";

// import { auth } from "@/auth";

// import { getUserOrderById } from "@/lib/services/order.service";

// type OrderRouteProps = {
//   params: Promise<{
//     id: string;
//   }>;
// };

// export async function GET(_request: Request, { params }: OrderRouteProps) {
//   try {
//     const session = await auth();

//     if (!session?.user?.id) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "You must be logged in to view this order.",
//         },
//         {
//           status: 401,
//         },
//       );
//     }

//     const userId = Number(session.user.id);

//     if (!Number.isInteger(userId)) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Invalid user session.",
//         },
//         {
//           status: 401,
//         },
//       );
//     }

//     const { id } = await params;

//     const orderId = id?.trim();

//     if (!orderId) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Order ID is required.",
//         },
//         {
//           status: 400,
//         },
//       );
//     }

//     const order = await getUserOrderById(userId, orderId);

//     if (!order) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Order not found.",
//         },
//         {
//           status: 404,
//         },
//       );
//     }

//     return NextResponse.json(
//       {
//         success: true,
//         data: order,
//       },
//       {
//         status: 200,
//       },
//     );
//   } catch (error) {
//     console.error("Get order detail error:", error);

//     return NextResponse.json(
//       {
//         success: false,
//         message: "Unable to load order details.",
//       },
//       {
//         status: 500,
//       },
//     );
//   }
// }
