"use client";

import { useState } from "react";

import BulkImportModal from "@/components/admin/products/bulk-import-modal";
import type { CategoryOption, ColorOption, SizeOption } from "@/lib/bulk-import-types";

type Props = {
  categories: CategoryOption[];
  colors: ColorOption[];
  sizes: SizeOption[];
};

export default function BulkImportTrigger({ categories, colors, sizes }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-4 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        Add Multiple Products
      </button>

      <BulkImportModal
        open={open}
        onClose={() => setOpen(false)}
        categories={categories}
        colors={colors}
        sizes={sizes}
      />
    </>
  );
}
