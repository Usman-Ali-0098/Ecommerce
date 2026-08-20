import { prisma } from "@/lib/prisma";

export async function getPublicCategories() {
  return prisma.category.findMany({
    where: {
      isActive: true,

      products: {
        some: {
          isActive: true,

          variants: {
            some: {
              isActive: true,
            },
          },
        },
      },
    },

    orderBy: {
      name: "asc",
    },

    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
}
