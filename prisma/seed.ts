// import "dotenv/config";

// import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "../src/generated/prisma/client";

// const connectionString = process.env.DATABASE_URL;

// if (!connectionString) {
//   throw new Error("DATABASE_URL is not defined.");
// }

// const adapter = new PrismaPg({
//   connectionString,
// });

// const prisma = new PrismaClient({
//   adapter,
// });

// async function main() {
//   console.log("Starting seed...");

//   /*
//    * ----------------------------------------------------
//    * CATEGORIES
//    * ----------------------------------------------------
//    */

//   const clothing = await prisma.category.upsert({
//     where: {
//       slug: "clothing",
//     },
//     update: {
//       name: "Clothing",
//       isActive: true,
//     },
//     create: {
//       name: "Clothing",
//       slug: "clothing",
//       isActive: true,
//     },
//   });

//   const electronics = await prisma.category.upsert({
//     where: {
//       slug: "electronics",
//     },
//     update: {
//       name: "Electronics",
//       isActive: true,
//     },
//     create: {
//       name: "Electronics",
//       slug: "electronics",
//       isActive: true,
//     },
//   });

//   /*
//    * ----------------------------------------------------
//    * COLORS
//    * ----------------------------------------------------
//    */

//   const red = await prisma.color.upsert({
//     where: {
//       name: "Red",
//     },
//     update: {
//       hexacode: "#DC2626",
//       isActive: true,
//     },
//     create: {
//       name: "Red",
//       hexacode: "#DC2626",
//       isActive: true,
//     },
//   });

//   const blue = await prisma.color.upsert({
//     where: {
//       name: "Blue",
//     },
//     update: {
//       hexacode: "#2563EB",
//       isActive: true,
//     },
//     create: {
//       name: "Blue",
//       hexacode: "#2563EB",
//       isActive: true,
//     },
//   });

//   /*
//    * ----------------------------------------------------
//    * SIZES
//    * ----------------------------------------------------
//    */

//   const small = await prisma.size.upsert({
//     where: {
//       name: "Small",
//     },
//     update: {
//       sortOrder: 1,
//       isActive: true,
//     },
//     create: {
//       name: "Small",
//       sortOrder: 1,
//       isActive: true,
//     },
//   });

//   const medium = await prisma.size.upsert({
//     where: {
//       name: "Medium",
//     },
//     update: {
//       sortOrder: 2,
//       isActive: true,
//     },
//     create: {
//       name: "Medium",
//       sortOrder: 2,
//       isActive: true,
//     },
//   });

//   /*
//    * ----------------------------------------------------
//    * VARIABLE PRODUCT
//    * Classic Shirt
//    * Category: Clothing
//    * ----------------------------------------------------
//    */

//   const classicShirt = await prisma.product.upsert({
//     where: {
//       slug: "classic-shirt",
//     },
//     update: {
//       name: "Classic Shirt",
//       description:
//         "A comfortable classic shirt available in multiple colors and sizes.",
//       categoryId: clothing.id,
//       isActive: true,
//     },
//     create: {
//       name: "Classic Shirt",
//       slug: "classic-shirt",
//       description:
//         "A comfortable classic shirt available in multiple colors and sizes.",
//       categoryId: clothing.id,
//       isActive: true,
//     },
//   });

//   /*
//    * Product image
//    */
//   const existingShirtImage =
//     await prisma.productImage.findFirst({
//       where: {
//         productId: classicShirt.id,
//         url: "/products/classic-shirt.jpeg",
//       },
//     });

//   if (!existingShirtImage) {
//     await prisma.productImage.create({
//       data: {
//         productId: classicShirt.id,
//         url: "/products/classic-shirt.jpeg",
//         altText: "Classic shirt",
//         position: 0,
//         isPrimary: true,
//       },
//     });
//   }

//   /*
//    * ----------------------------------------------------
//    * CLASSIC SHIRT VARIANT MATRIX
//    * ----------------------------------------------------
//    *
//    * Red + Small
//    * Red + Medium
//    * Blue + Small
//    * Blue + Medium
//    */

//   await prisma.productVariant.upsert({
//     where: {
//       sku: "SHIRT-RED-S",
//     },
//     update: {
//       productId: classicShirt.id,
//       colorId: red.id,
//       sizeId: small.id,
//       price: 2000,
//       stock: 10,
//       isActive: true,
//     },
//     create: {
//       productId: classicShirt.id,
//       colorId: red.id,
//       sizeId: small.id,
//       sku: "SHIRT-RED-S",
//       price: 2000,
//       stock: 10,
//       isActive: true,
//     },
//   });

//   await prisma.productVariant.upsert({
//     where: {
//       sku: "SHIRT-RED-M",
//     },
//     update: {
//       productId: classicShirt.id,
//       colorId: red.id,
//       sizeId: medium.id,
//       price: 2000,
//       stock: 15,
//       isActive: true,
//     },
//     create: {
//       productId: classicShirt.id,
//       colorId: red.id,
//       sizeId: medium.id,
//       sku: "SHIRT-RED-M",
//       price: 2000,
//       stock: 15,
//       isActive: true,
//     },
//   });

//   await prisma.productVariant.upsert({
//     where: {
//       sku: "SHIRT-BLU-S",
//     },
//     update: {
//       productId: classicShirt.id,
//       colorId: blue.id,
//       sizeId: small.id,
//       price: 2200,
//       stock: 5,
//       isActive: true,
//     },
//     create: {
//       productId: classicShirt.id,
//       colorId: blue.id,
//       sizeId: small.id,
//       sku: "SHIRT-BLU-S",
//       price: 2200,
//       stock: 5,
//       isActive: true,
//     },
//   });

//   await prisma.productVariant.upsert({
//     where: {
//       sku: "SHIRT-BLU-M",
//     },
//     update: {
//       productId: classicShirt.id,
//       colorId: blue.id,
//       sizeId: medium.id,
//       price: 2200,
//       stock: 8,
//       isActive: true,
//     },
//     create: {
//       productId: classicShirt.id,
//       colorId: blue.id,
//       sizeId: medium.id,
//       sku: "SHIRT-BLU-M",
//       price: 2200,
//       stock: 8,
//       isActive: true,
//     },
//   });

//   /*
//    * ----------------------------------------------------
//    * SIMPLE PRODUCT
//    * Wireless Charger
//    * Category: Electronics
//    * ----------------------------------------------------
//    */

//   const wirelessCharger = await prisma.product.upsert({
//     where: {
//       slug: "wireless-charger",
//     },
//     update: {
//       name: "Wireless Charger",
//       description:
//         "A fast wireless charger with a compact design.",
//       categoryId: electronics.id,
//       isActive: true,
//     },
//     create: {
//       name: "Wireless Charger",
//       slug: "wireless-charger",
//       description:
//         "A fast wireless charger with a compact design.",
//       categoryId: electronics.id,
//       isActive: true,
//     },
//   });

//   /*
//    * Product image
//    */
//   const existingChargerImage =
//     await prisma.productImage.findFirst({
//       where: {
//         productId: wirelessCharger.id,
//         url: "/products/wireless-charger.jpeg",
//       },
//     });

//   if (!existingChargerImage) {
//     await prisma.productImage.create({
//       data: {
//         productId: wirelessCharger.id,
//         url: "/products/wireless-charger.jpeg",
//         altText: "Wireless charger",
//         position: 0,
//         isPrimary: true,
//       },
//     });
//   }

//   /*
//    * Simple product still has one default variant.
//    */
//   await prisma.productVariant.upsert({
//     where: {
//       sku: "CHARGER-001",
//     },
//     update: {
//       productId: wirelessCharger.id,
//       colorId: null,
//       sizeId: null,
//       price: 2500,
//       stock: 30,
//       isActive: true,
//     },
//     create: {
//       productId: wirelessCharger.id,
//       colorId: null,
//       sizeId: null,
//       sku: "CHARGER-001",
//       price: 2500,
//       stock: 30,
//       isActive: true,
//     },
//   });

//   console.log("Seed completed successfully.");

//   console.log("Categories:");
//   console.log(`- ${clothing.name}`);
//   console.log(`- ${electronics.name}`);

//   console.log("Colors:");
//   console.log(`- ${red.name}`);
//   console.log(`- ${blue.name}`);

//   console.log("Sizes:");
//   console.log(`- ${small.name}`);
//   console.log(`- ${medium.name}`);

//   console.log("Products:");
//   console.log(
//     `- ${classicShirt.name} → ${clothing.name}`
//   );
//   console.log(
//     `- ${wirelessCharger.name} → ${electronics.name}`
//   );
// }

// main()
//   .catch((error: unknown) => {
//     console.error("Seed failed:", error);
//     process.exitCode = 1;
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
