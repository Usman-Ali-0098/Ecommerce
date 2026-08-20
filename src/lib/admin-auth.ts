import { auth } from "@/auth";

import {
  prisma,
} from "@/lib/prisma";

export async function getAdminSession() {
  const session = await auth();

  if (
    !session?.user?.id ||
    session.user.role !== "ADMIN"
  ) {
    return null;
  }

  const userId = Number(session.user.id);

  if (!Number.isInteger(userId)) {
    return null;
  }

  const admin =
    await prisma.user.findFirst({
      where: {
        id: userId,
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
