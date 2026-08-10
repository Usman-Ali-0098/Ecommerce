import {
  NextResponse,
} from "next/server";

import {
  getAdminSession,
} from "@/lib/admin-auth";

import {
  cloudinary,
} from "@/lib/cloudinary";

export async function POST(
  request: Request
) {
  try {
    /*
     * Only explicitly logged-in
     * admin may request signatures.
     */
    const admin =
      await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const apiSecret =
      process.env
        .CLOUDINARY_API_SECRET;

    if (!apiSecret) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cloudinary API secret is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      await request.json();

    const paramsToSign =
      body?.paramsToSign;

    if (
      !paramsToSign ||
      typeof paramsToSign !==
        "object" ||
      Array.isArray(
        paramsToSign
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Cloudinary parameters.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * The widget sends the final
     * timestamp and upload params.
     *
     * Sign exactly those values.
     */
    const signature =
      cloudinary.utils
        .api_sign_request(
          paramsToSign,
          apiSecret
        );

    return NextResponse.json({
      success: true,
      signature,
    });
  } catch (error) {
    console.error(
      "Cloudinary signature error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to authorize image upload.",
      },
      {
        status: 500,
      }
    );
  }
}