export type CategoryOption = { id: string; name: string; isActive: boolean };
export type ColorOption = { id: string; name: string; hexacode: string | null; isActive?: boolean };
export type SizeOption = { id: string; name: string; sortOrder?: number; isActive?: boolean };

export type PickedImage = {
  id: string;
  file: File;
  previewUrl: string;
  assignedToProductTempId: string | null;
  // Mirrors the single-product form's image model: each image assigned to a
  // product can be tagged with a color (null = general/no specific color),
  // and variants of that color preview this image as their thumbnail.
  colorId: string | null;
  isPrimary: boolean;
};

export type DraftVariant = {
  tempId: string;

  colorId: string;
  colorLabel: string;
  showNewColor: boolean;
  newColorName: string;
  newColorHex: string;
  isAddingColor: boolean;

  sizeId: string;
  sizeLabel: string;
  showNewSize: boolean;
  newSizeName: string;
  newSizeSortOrder: string;
  isAddingSize: boolean;

  sku: string;
  price: string;
  stock: string;

  // This row's own image filename from the CSV — lets a product have a
  // different photo per color (e.g. sneakers-black.jpg vs sneakers-white.jpg)
  // instead of one shared image for the whole product.
  imageFilenameFromCsv: string;
};

export type DraftProduct = {
  tempId: string;
  name: string;
  description: string;

  // Default price applied only when a new variant is added via the builder
  // — existing variants keep their own independently-editable price.
  price: string;

  // Same role as the single-product form's "Base SKU": the actual SKU when
  // this product has no variants yet (a simple product), and the prefix
  // used to auto-generate a SKU when a variant is added via the builder.
  baseSku: string;
  // Only used (and only editable) when variants.length === 0 — mirrors the
  // single-product form's Quantity field for a simple product.
  quantity: string;

  categoryId: string;
  categoryLabel: string;
  showNewCategory: boolean;
  newCategoryName: string;
  isAddingCategory: boolean;

  // Distinct CSV image filenames referenced by this product's variants that
  // couldn't be matched to an uploaded file — populated by the auto-match
  // pass, shown as a warning on the review screen.
  unmatchedImageFilenames: string[];
  variants: DraftVariant[];

  // Only used when variants is empty (a simple, colorless/sizeless product)
  // — the CSV row's own image filename, since there's no variant to hold it.
  simpleImageFilenameFromCsv: string;
};

export function makeBlankProduct(): DraftProduct {
  return {
    tempId: nextTempId(),
    name: "",
    description: "",
    price: "",
    baseSku: "",
    quantity: "",
    categoryId: "",
    categoryLabel: "",
    showNewCategory: false,
    newCategoryName: "",
    isAddingCategory: false,
    unmatchedImageFilenames: [],
    variants: [],
    simpleImageFilenameFromCsv: "",
  };
}

// Every distinct, non-empty image filename referenced by this product — from
// its variant rows, or (for a simple product with no variants) the single
// row's own filename.
export function distinctImageFilenames(product: DraftProduct): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const candidates =
    product.variants.length > 0
      ? product.variants.map((v) => v.imageFilenameFromCsv)
      : [product.simpleImageFilenameFromCsv];

  for (const name of candidates) {
    const trimmed = name.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      result.push(trimmed);
    }
  }
  return result;
}

export function skuPart(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let tempIdCounter = 0;
export function nextTempId() {
  tempIdCounter += 1;
  return `tmp-${tempIdCounter}`;
}

export function findByName<T extends { name: string }>(list: T[], name: string): T | undefined {
  const target = name.trim().toLowerCase();
  if (!target) return undefined;
  return list.find((item) => item.name.trim().toLowerCase() === target);
}

export function slugifyForMatch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "");
}
