"use client";

import { useState } from "react";

import BulkImportModal from "@/components/admin/products/bulk-import-modal";

export default function BulkImportTrigger() {
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
      />
    </>
  );
}
