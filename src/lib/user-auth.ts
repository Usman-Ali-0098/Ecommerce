import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export async function getUserSession() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "USER") {
    return null;
  }

  const userId = Number(session.user.id);

  if (!Number.isInteger(userId)) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
      role: "USER",
    },

    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });
}
