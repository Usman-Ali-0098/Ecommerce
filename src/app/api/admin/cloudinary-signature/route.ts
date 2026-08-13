import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { cloudinary } from "@/lib/cloudinary";

const PRODUCT_IMAGE_FOLDER = "ecommerce/products";

export async function POST() {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin authentication required.",
        },
        {
          status: 401,
        },
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    const apiKey = process.env.CLOUDINARY_API_KEY;

    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "Cloudinary configuration is missing.",
        },
        {
          status: 500,
        },
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder: PRODUCT_IMAGE_FOLDER,
      },

      apiSecret,
    );

    return NextResponse.json({
      success: true,

      cloudName,

      apiKey,

      timestamp,

      folder: PRODUCT_IMAGE_FOLDER,

      signature,
    });
  } catch (error) {
    console.error("Cloudinary signature error:", error);

    return NextResponse.json(
      {
        success: false,

        message: "Unable to authorize image upload.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
 * Used only for cleanup if:
 *
 * images successfully uploaded
 * to Cloudinary
 *
 * BUT
 *
 * product saving fails.
 */
export async function DELETE(request: Request) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,

          message: "Admin authentication required.",
        },
        {
          status: 401,
        },
      );
    }

    const body = await request.json();

    const publicIds = Array.isArray(body?.publicIds)
      ? body.publicIds.filter(
          (value: unknown): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
      : [];

    if (publicIds.length === 0) {
      return NextResponse.json({
        success: true,
      });
    }

    await Promise.allSettled(
      publicIds.map((publicId: string) =>
        cloudinary.uploader.destroy(publicId, {
          resource_type: "image",

          invalidate: true,
        }),
      ),
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Cloudinary cleanup error:", error);

    return NextResponse.json(
      {
        success: false,

        message: "Unable to clean up uploaded images.",
      },
      {
        status: 500,
      },
    );
  }
}
