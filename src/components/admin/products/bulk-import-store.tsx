"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

import type {
  CategoryOption,
  ColorOption,
  DraftProduct,
  PickedImage,
  SizeOption,
} from "@/lib/bulk-import-types";

type BulkImportStore = {
  products: DraftProduct[];
  setProducts: React.Dispatch<React.SetStateAction<DraftProduct[]>>;

  images: PickedImage[];
  setImages: React.Dispatch<React.SetStateAction<PickedImage[]>>;

  categoryOptions: CategoryOption[];
  setCategoryOptions: React.Dispatch<React.SetStateAction<CategoryOption[]>>;

  colorOptions: ColorOption[];
  setColorOptions: React.Dispatch<React.SetStateAction<ColorOption[]>>;

  sizeOptions: SizeOption[];
  setSizeOptions: React.Dispatch<React.SetStateAction<SizeOption[]>>;

  trackObjectUrl: (url: string) => void;
  clearDraft: () => void;
};

const BulkImportContext = createContext<BulkImportStore | null>(null);

export function BulkImportStoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [colorOptions, setColorOptions] = useState<ColorOption[]>([]);
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>([]);

  const objectUrlsRef = useRef<Set<string>>(new Set());

  const trackObjectUrl = useCallback((url: string) => {
    objectUrlsRef.current.add(url);
  }, []);

  const clearDraft = useCallback(() => {
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    objectUrlsRef.current.clear();

    setProducts([]);
    setImages([]);
    setCategoryOptions([]);
    setColorOptions([]);
    setSizeOptions([]);
  }, []);

  return (
    <BulkImportContext.Provider
      value={{
        products,
        setProducts,
        images,
        setImages,
        categoryOptions,
        setCategoryOptions,
        colorOptions,
        setColorOptions,
        sizeOptions,
        setSizeOptions,
        trackObjectUrl,
        clearDraft,
      }}
    >
      {children}
    </BulkImportContext.Provider>
  );
}

export function useBulkImportStore() {
  const store = useContext(BulkImportContext);
  if (!store) {
    throw new Error("useBulkImportStore must be used within a BulkImportStoreProvider.");
  }
  return store;
}
