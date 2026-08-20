// import { createElement } from "react";
// import { NextResponse } from "next/server";

// import PasswordResetEmail from "@/emails/password-reset-email";
// import resend from "@/lib/resend";

// export async function POST(request: Request) {
//   try {
//     const body = (await request.json()) as {
//       email?: string;
//     };

//     if (!body.email) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Email is required",
//         },
//         { status: 400 }
//       );
//     }

//     const appUrl = process.env.APP_URL;

//     if (!appUrl) {
//       throw new Error("APP_URL is not configured");
//     }

//     const resetUrl =
//       `${appUrl}/reset-password` +
//       "?token=temporary-test-token";

//     const { data, error } = await resend.emails.send({
//       from:
//         process.env.EMAIL_FROM ??
//         "Authentication App <onboarding@resend.dev>",

//       to: [body.email],

//       subject: "Reset your password",

//       react: createElement(PasswordResetEmail, {
//         fullName: "Test User",
//         resetUrl,
//       }),
//     });

//     if (error) {
//       console.error("Resend test error:", error);

//       return NextResponse.json(
//         {
//           success: false,
//           message: "Email could not be sent",
//           error,
//         },
//         { status: 500 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       message: "Test reset email sent successfully",
//       emailId: data?.id,
//     });
//   } catch (error) {
//     console.error("Test reset email error:", error);

//     return NextResponse.json(
//       {
//         success: false,
//         message: "Internal server error",
//       },
//       { status: 500 }
//     );
//   }
// }
