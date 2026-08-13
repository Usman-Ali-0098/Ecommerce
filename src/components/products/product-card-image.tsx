"use client";

import Image from "next/image";

import { useEffect, useMemo, useState } from "react";

type ProductImage = {
  id: string;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
  position: number;
};

type ProductCardImageProps = {
  images: ProductImage[];
  productName: string;
};

export default function ProductCardImage({
  images,
  productName,
}: ProductCardImageProps) {
  const orderedImages = useMemo(() => {
    if (images.length === 0) {
      return [];
    }

    const primaryImage = images.find((image) => image.isPrimary) ?? images[0];

    const otherImages = images.filter((image) => image.id !== primaryImage.id);

    return [primaryImage, ...otherImages];
  }, [images]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered || orderedImages.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentIndex((current) => (current + 1) % orderedImages.length);
    }, 800);

    return () => {
      window.clearInterval(interval);
    };
  }, [isHovered, orderedImages.length]);

  function handleMouseEnter() {
    setIsHovered(true);

    /*
     * Optional:
     * move directly to image 2
     * when hover starts.
     */
    if (orderedImages.length > 1) {
      setCurrentIndex(1);
    }
  }

  function handleMouseLeave() {
    setIsHovered(false);

    /*
     * Return to primary image.
     */
    setCurrentIndex(0);
  }

  if (orderedImages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400">
        No Image
      </div>
    );
  }

  const currentImage = orderedImages[currentIndex];

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Image
        key={currentImage.id}
        src={currentImage.url}
        alt={currentImage.altText ?? productName}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        className="object-cover transition-opacity duration-300"
      />

      {orderedImages.length > 1 ? (
        <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {orderedImages.map((image, index) => (
            <span
              key={image.id}
              className={`h-1.5 rounded-full transition-all ${
                index === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
