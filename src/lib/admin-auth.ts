import crypto from "crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const ADMIN_COOKIE_NAME = "admin_session";

const ADMIN_SESSION_MAX_AGE =
  60 * 60 * 8; // 8 hours

type AdminTokenPayload = {
  userId: number;
  email: string;
  exp: number;
};

function getSecret() {
  const secret =
    process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET is missing."
    );
  }

  return secret;
}

function sign(value: string) {
  return crypto
    .createHmac(
      "sha256",
      getSecret()
    )
    .update(value)
    .digest("base64url");
}

function encodePayload(
  payload: AdminTokenPayload
) {
  return Buffer.from(
    JSON.stringify(payload)
  ).toString("base64url");
}

function decodePayload(
  value: string
): AdminTokenPayload | null {
  try {
    return JSON.parse(
      Buffer.from(
        value,
        "base64url"
      ).toString("utf8")
    );
  } catch {
    return null;
  }
}

export function createAdminToken(
  userId: number,
  email: string
) {
  const payload: AdminTokenPayload = {
    userId,
    email,

    exp:
      Math.floor(Date.now() / 1000) +
      ADMIN_SESSION_MAX_AGE,
  };

  const encoded =
    encodePayload(payload);

  const signature =
    sign(encoded);

  return `${encoded}.${signature}`;
}

export function verifyAdminToken(
  token: string
): AdminTokenPayload | null {
  try {
    const [
      encoded,
      providedSignature,
    ] = token.split(".");

    if (
      !encoded ||
      !providedSignature
    ) {
      return null;
    }

    const expectedSignature =
      sign(encoded);

    const expectedBuffer =
      Buffer.from(
        expectedSignature
      );

    const providedBuffer =
      Buffer.from(
        providedSignature
      );

    if (
      expectedBuffer.length !==
      providedBuffer.length
    ) {
      return null;
    }

    const valid =
      crypto.timingSafeEqual(
        expectedBuffer,
        providedBuffer
      );

    if (!valid) {
      return null;
    }

    const payload =
      decodePayload(encoded);

    if (!payload) {
      return null;
    }

    if (
      payload.exp <
      Math.floor(
        Date.now() / 1000
      )
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function setAdminSession(
  userId: number,
  email: string
) {
  const cookieStore =
    await cookies();

  cookieStore.set(
    ADMIN_COOKIE_NAME,
    createAdminToken(
      userId,
      email
    ),
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax",

      path: "/",

      maxAge:
        ADMIN_SESSION_MAX_AGE,
    }
  );
}

export async function clearAdminSession() {
  const cookieStore =
    await cookies();

  cookieStore.delete(
    ADMIN_COOKIE_NAME
  );
}

export async function getAdminSession() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      ADMIN_COOKIE_NAME
    )?.value;

  if (!token) {
    return null;
  }

  const payload =
    verifyAdminToken(token);

  if (!payload) {
    return null;
  }

  /*
   * Re-check database role.
   *
   * Important:
   * even with a valid cookie,
   * user must STILL be ADMIN.
   */
  const admin =
    await prisma.user.findFirst({
      where: {
        id: payload.userId,
        email: payload.email,
        role: "ADMIN",
      },

      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

  return admin;
}