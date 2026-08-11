import crypto from "crypto";
import {
  cookies,
} from "next/headers";

import {
  prisma,
} from "@/lib/prisma";

const ADMIN_COOKIE_NAME =
  "admin_session";

const ONE_HOUR =
  60 * 60;

const DEFAULT_ADMIN_SESSION_MAX_AGE =
  24 * ONE_HOUR;

const REMEMBER_ADMIN_SESSION_MAX_AGE =
  48 * ONE_HOUR;

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

function sign(
  value: string
) {
  return crypto
    .createHmac(
      "sha256",
      getSecret()
    )
    .update(value)
    .digest(
      "base64url"
    );
}

function encodePayload(
  payload: AdminTokenPayload
) {
  return Buffer.from(
    JSON.stringify(
      payload
    )
  ).toString(
    "base64url"
  );
}

function decodePayload(
  value: string
): AdminTokenPayload | null {
  try {
    return JSON.parse(
      Buffer.from(
        value,
        "base64url"
      ).toString(
        "utf8"
      )
    );
  } catch {
    return null;
  }
}

function getAdminSessionMaxAge(
  rememberMe: boolean
) {
  return rememberMe
    ? REMEMBER_ADMIN_SESSION_MAX_AGE
    : DEFAULT_ADMIN_SESSION_MAX_AGE;
}

export function createAdminToken(
  userId: number,
  email: string,
  maxAgeSeconds: number
) {
  const payload: AdminTokenPayload = {
    userId,
    email,

    exp:
      Math.floor(
        Date.now() /
          1000
      ) +
      maxAgeSeconds,
  };

  const encoded =
    encodePayload(
      payload
    );

  const signature =
    sign(
      encoded
    );

  return `${encoded}.${signature}`;
}

export function verifyAdminToken(
  token: string
): AdminTokenPayload | null {
  try {
    const [
      encoded,
      providedSignature,
    ] =
      token.split(".");

    if (
      !encoded ||
      !providedSignature
    ) {
      return null;
    }

    const expectedSignature =
      sign(
        encoded
      );

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
      decodePayload(
        encoded
      );

    if (!payload) {
      return null;
    }

    if (
      payload.exp <=
      Math.floor(
        Date.now() /
          1000
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
  email: string,
  rememberMe = false
) {
  const cookieStore =
    await cookies();

  const maxAge =
    getAdminSessionMaxAge(
      rememberMe
    );

  const token =
    createAdminToken(
      userId,
      email,
      maxAge
    );

  cookieStore.set(
    ADMIN_COOKIE_NAME,
    token,
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite:
        "lax",

      path:
        "/",

      maxAge,
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
    verifyAdminToken(
      token
    );

  if (!payload) {
    return null;
  }

  /*
   * Even with a valid signed
   * cookie, verify that this
   * account is still an ADMIN.
   */
  const admin =
    await prisma.user.findFirst({
      where: {
        id:
          payload.userId,

        email:
          payload.email,

        role:
          "ADMIN",
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