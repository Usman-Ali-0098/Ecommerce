type ResolvableProductImage = {
  url: string;
  altText?: string | null;
  colorId?: string | null;
  isPrimary?: boolean;
  position?: number;
};

type ResolveProductImageParams<TImage extends ResolvableProductImage> = {
  images: TImage[];
  colorId?: string | null;
  variantImageUrl?: string | null;
  fallbackAltText?: string;
};

export function resolveProductImage<TImage extends ResolvableProductImage>({
  images,
  colorId,
  variantImageUrl,
  fallbackAltText,
}: ResolveProductImageParams<TImage>) {
  if (variantImageUrl) {
    return {
      url: variantImageUrl,
      altText: fallbackAltText ?? null,
    };
  }

  const colorImage = colorId
    ? images.find((image) => image.colorId === colorId)
    : null;

  const generalImages = images.filter((image) => !image.colorId);
  const generalImage =
    generalImages.find((image) => image.isPrimary) ?? generalImages[0];
  const fallbackImage =
    images.find((image) => image.isPrimary) ?? images[0] ?? null;
  const image = colorImage ?? generalImage ?? fallbackImage;

  return image
    ? {
        url: image.url,
        altText: image.altText ?? fallbackAltText ?? null,
      }
    : null;
}
