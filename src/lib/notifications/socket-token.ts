import { createHmac, timingSafeEqual } from "node:crypto";

export type NotificationSocketRole = "USER" | "ADMIN";

type NotificationSocketClaims = {
  userId: number;
  role: NotificationSocketRole;
  expiresAt: number;
};

const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;

function getSigningSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is required for notification sockets.");
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("base64url");
}

export function createNotificationSocketToken({
  userId,
  role,
}: Omit<NotificationSocketClaims, "expiresAt">) {
  const claims: NotificationSocketClaims = {
    userId,
    role,
    expiresAt: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");

  return `${payload}.${signPayload(payload)}`;
}

export function verifyNotificationSocketToken(
  token: string,
): NotificationSocketClaims | null {
  const [payload, signature, extra] = token.split(".");

  if (!payload || !signature || extra) {
    return null;
  }

  const expected = Buffer.from(signPayload(payload));
  const received = Buffer.from(signature);

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<NotificationSocketClaims>;

    if (
      !Number.isInteger(claims.userId) ||
      (claims.role !== "USER" && claims.role !== "ADMIN") ||
      typeof claims.expiresAt !== "number" ||
      claims.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return claims as NotificationSocketClaims;
  } catch {
    return null;
  }
}
