import { z } from "zod";

const nullableTrimmedString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() ? value.trim() : null,
  z.string().nullable(),
);

const optionalTrimmedId = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined,
  z.string().optional(),
);

const productVariantSchema = z
  .object({
    id: optionalTrimmedId,
    sku: z.string().trim().min(1, "Every variant requires an SKU.").transform((sku) => sku.toUpperCase()),
    price: z.coerce.number().int().positive("Price must be a whole rupee amount."),
    stock: z.coerce.number().int().nonnegative("Stock must be 0 or greater."),
    colorId: nullableTrimmedString,
    sizeId: nullableTrimmedString,
    imageUrl: nullableTrimmedString,
    imagePublicId: nullableTrimmedString,
  })
  .superRefine((variant, context) => {
    if (Boolean(variant.imageUrl) !== Boolean(variant.imagePublicId)) {
      context.addIssue({
        code: "custom",
        path: ["imageUrl"],
        message: `Invalid variant image for ${variant.sku}.`,
      });
    }
  });

const newImageSchema = z.object({
  source: z.literal("new"),
  url: z.string().trim().min(1, "Image URL is required."),
  publicId: z.string().trim().min(1, "Image public ID is required."),
  colorId: nullableTrimmedString,
  position: z.coerce.number().int().nonnegative().optional(),
  isPrimary: z.boolean().default(false),
});

const existingImageSchema = z.object({
  source: z.literal("existing"),
  id: z.string().trim().min(1, "Existing image ID is required."),
  colorId: nullableTrimmedString,
  position: z.coerce.number().int().nonnegative().optional(),
  isPrimary: z.boolean().default(false),
});

const createImagesSchema = z
  .array(newImageSchema)
  .default([])
  .transform((images) =>
    images.map((image, index) => ({
      ...image,
      position: image.position ?? index,
    })),
  );

const updateImagesSchema = z
  .array(z.discriminatedUnion("source", [existingImageSchema, newImageSchema]))
  .default([])
  .transform((images) =>
    images.map((image, index) => ({
      ...image,
      position: image.position ?? index,
    })),
  );

const productFields = {
  name: z.string().trim().min(1, "Product name is required."),
  description: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string(),
  ),
  categoryId: z.string().trim().min(1, "Valid category is required."),
  isActive: z.preprocess((value) => value !== false, z.boolean()),
};

export const createAdminProductSchema = z.object({
  ...productFields,
  images: createImagesSchema,
  variants: z
    .array(productVariantSchema)
    .min(1, "At least one product variant is required."),
});

export const updateAdminProductSchema = z.object({
  ...productFields,
  images: updateImagesSchema,
  variants: z
    .array(productVariantSchema)
    .min(1, "At least one variant is required."),
});
