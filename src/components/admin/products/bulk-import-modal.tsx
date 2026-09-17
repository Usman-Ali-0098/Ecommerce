"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderOpen,
  ImageUp,
  Images,
  PackageCheck,
  PackagePlus,
  UploadCloud,
  X,
} from "lucide-react";
import Image from "next/image";

import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";

import { useAlert } from "@/hooks/use-alert";
import { parseProductCsv } from "@/lib/csv";
import {
  distinctImageFilenames,
  findByName,
  nextTempId,
  slugifyForMatch,
  type CategoryOption,
  type ColorOption,
  type DraftProduct,
  type DraftVariant,
  type PickedImage,
  type SizeOption,
} from "@/lib/bulk-import-types";

import { useBulkImportStore } from "@/components/admin/products/bulk-import-store";

type Props = {
  open: boolean;
  onClose: () => void;
  categories: CategoryOption[];
  colors: ColorOption[];
  sizes: SizeOption[];
};

export default function BulkImportModal({ open, onClose, categories, colors, sizes }: Props) {
  const router = useRouter();
  const { alert, showAlert, closeAlert } = useAlert();
  const store = useBulkImportStore();

  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pendingProducts, setPendingProducts] = useState<DraftProduct[]>([]);
  const [pendingImages, setPendingImages] = useState<PickedImage[]>([]);

  function resetLocal() {
    setCsvFileName(null);
    setParseError(null);
    setPendingProducts([]);
    setPendingImages([]);
  }

  function handleClose() {
    for (const img of pendingImages) URL.revokeObjectURL(img.previewUrl);
    resetLocal();
    onClose();
  }

  function buildDraftProducts(rows: ReturnType<typeof parseProductCsv>["rows"]) {
    const grouped = new Map<string, DraftVariant[]>();
    const productMeta = new Map<string, { description: string; category: string }>();

    for (const row of rows) {
      if (!row.productName) continue;
      const key = row.productName.trim();

      if (!productMeta.has(key)) {
        productMeta.set(key, { description: row.description, category: row.category });
      }

      const color = findByName(colors, row.color);
      const size = findByName(sizes, row.size);

      const variant: DraftVariant = {
        tempId: nextTempId(),

        colorId: color?.id ?? "",
        colorLabel: row.color,
        showNewColor: Boolean(row.color) && !color,
        newColorName: row.color,
        newColorHex: "#000000",
        isAddingColor: false,

        sizeId: size?.id ?? "",
        sizeLabel: row.size,
        showNewSize: Boolean(row.size) && !size,
        newSizeName: row.size,
        newSizeSortOrder: "0",
        isAddingSize: false,

        sku: row.sku,
        price: row.price,
        stock: row.stock,

        imageFilenameFromCsv: row.image,
      };

      grouped.set(key, [...(grouped.get(key) ?? []), variant]);
    }

    return Array.from(grouped.entries()).map(([name, variants]): DraftProduct => {
      const meta = productMeta.get(name);
      const category = findByName(categories, meta?.category ?? "");

      const categoryFields = {
        categoryId: category?.id ?? "",
        categoryLabel: meta?.category ?? "",
        showNewCategory: Boolean(meta?.category) && !category,
        newCategoryName: meta?.category ?? "",
        isAddingCategory: false,
      };

      // A row with no color AND no size is a simple product, same as the
      // single-product form: its SKU/price/stock become Base SKU/Price/
      // Total Quantity directly, with an empty variants list — not a
      // variant box showing "—" placeholders.
      const isSimple = variants.every((v) => !v.colorLabel.trim() && !v.sizeLabel.trim());

      if (isSimple) {
        const only = variants[0];
        return {
          tempId: nextTempId(),
          name,
          description: meta?.description ?? "",
          price: only.price,
          baseSku: only.sku,
          quantity: only.stock,
          ...categoryFields,
          unmatchedImageFilenames: [],
          variants: [],
          simpleImageFilenameFromCsv: only.imageFilenameFromCsv,
        };
      }

      return {
        tempId: nextTempId(),
        name,
        description: meta?.description ?? "",
        price: variants[0]?.price ?? "",
        baseSku: "",
        quantity: variants[0]?.stock ?? "",
        ...categoryFields,
        unmatchedImageFilenames: [],
        variants,
        simpleImageFilenameFromCsv: "",
      };
    });
  }

  function handleCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setParseError(null);
    setCsvFileName(file.name);

    file.text().then((text) => {
      const { rows, error } = parseProductCsv(text);
      if (error) {
        setParseError(error);
        setPendingProducts([]);
        return;
      }

      setPendingProducts(buildDraftProducts(rows));
    });
  }

  function addPickedFiles(files: File[]) {
    if (files.length === 0) {
      showAlert("No files were picked — the folder may be empty, or your browser blocked the selection.", {
        variant: "warning",
      });
      return;
    }

    const existingKeys = new Set(pendingImages.map((img) => `${img.file.name}:${img.file.size}`));

    const newItems: PickedImage[] = [];
    const rejected: string[] = [];
    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        rejected.push(file.name);
        continue;
      }
      const key = `${file.name}:${file.size}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: crypto.randomUUID(),
        file,
        previewUrl,
        assignedToProductTempId: null,
        colorId: null,
        isPrimary: false,
      });
    }

    if (rejected.length > 0) {
      showAlert(`Skipped ${rejected.length} file(s) that aren't JPG/PNG/WEBP: ${rejected.join(", ")}`, {
        variant: "warning",
      });
    }

    if (newItems.length === 0) return;
    setPendingImages((current) => [...current, ...newItems]);
  }

  function removePendingImage(imageId: string) {
    const image = pendingImages.find((img) => img.id === imageId);
    if (image) URL.revokeObjectURL(image.previewUrl);
    setPendingImages((current) => current.filter((img) => img.id !== imageId));
  }

  function handleImageFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    addPickedFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleImageFolderSelected(event: ChangeEvent<HTMLInputElement>) {
    addPickedFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  /** For each product, matches every distinct image filename its variants
   * reference (not just one shared image) — so a CSV that gives a different
   * photo per color gets each one matched and auto-tagged with that color.
   * A filename only gets auto-tagged when every variant referencing it
   * agrees on exactly one (already-existing) color; a shared "general"
   * photo across multiple colors is left untagged, same as before. */
  function runAutoMatch(products: DraftProduct[], pickedImages: PickedImage[]) {
    const pool = pickedImages.map((img) => ({ ...img }));

    const matchedProducts = products.map((product) => {
      const filenames = distinctImageFilenames(product);
      if (filenames.length === 0) {
        return { ...product, unmatchedImageFilenames: [] };
      }

      const unmatched: string[] = [];
      let assignedAny = false;

      for (const filename of filenames) {
        const wanted = filename.trim().toLowerCase();
        let match = pool.find((img) => !img.assignedToProductTempId && img.file.name.toLowerCase() === wanted);

        if (!match) {
          const wantedSlug = slugifyForMatch(wanted);
          match = pool.find((img) => !img.assignedToProductTempId && slugifyForMatch(img.file.name) === wantedSlug);
        }

        if (!match) {
          unmatched.push(filename);
          continue;
        }

        const colorIdsForFilename = new Set(
          product.variants
            .filter((v) => v.imageFilenameFromCsv.trim().toLowerCase() === wanted && v.colorId)
            .map((v) => v.colorId),
        );

        match.assignedToProductTempId = product.tempId;
        match.isPrimary = !assignedAny;
        match.colorId = colorIdsForFilename.size === 1 ? [...colorIdsForFilename][0] : null;
        assignedAny = true;
      }

      return { ...product, unmatchedImageFilenames: unmatched };
    });

    return { products: matchedProducts, images: pool };
  }

  function goToReview() {
    if (pendingProducts.length === 0) {
      showAlert("Upload a CSV with at least one product first.", { variant: "warning" });
      return;
    }

    const { products: matchedProducts, images: matchedImages } = runAutoMatch(pendingProducts, pendingImages);
    for (const img of matchedImages) store.trackObjectUrl(img.previewUrl);

    store.setProducts(matchedProducts);
    store.setImages(matchedImages);
    store.setCategoryOptions(categories);
    store.setColorOptions(colors);
    store.setSizeOptions(sizes);

    resetLocal();
    onClose();
    router.push("/admin/products/import/review");
  }

  const totalVariants = pendingProducts.reduce((sum, p) => sum + p.variants.length, 0);

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title="Add Multiple Products"
        description="Upload a CSV, optionally add images, then review on the next screen."
        icon={<PackagePlus className="h-5 w-5" />}
        className="max-w-xl"
      >
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-0.5 sm:max-h-[75vh]">
          <a
            href="/templates/product-import-template.csv"
            download
            className="inline-flex items-center gap-2 rounded-lg bg-blue-50 py-2 pl-2 pr-3 text-xs font-semibold text-[#087ff5] transition hover:bg-blue-100"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#087ff5] shadow-sm">
              <Download size={13} />
            </span>
            Download CSV template
          </a>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#087ff5]">
                  <FileSpreadsheet size={14} />
                </span>
                <p className="text-xs font-semibold text-gray-800">Product CSV</p>
              </div>

              <label className="mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-2 text-xs font-medium text-gray-700 transition hover:border-[#087ff5] hover:bg-blue-50 hover:text-[#087ff5]">
                <UploadCloud size={14} />
                {csvFileName ? "Change CSV file" : "Select CSV file"}
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
              </label>

              {csvFileName ? (
                <p className="mt-1.5 flex items-center gap-1 truncate text-[10px] font-medium text-green-700" title={csvFileName}>
                  <CheckCircle2 size={11} className="shrink-0" />
                  <span className="truncate">{csvFileName}</span>
                </p>
              ) : (
                <p className="mt-1.5 text-[10px] leading-tight text-gray-400">
                  productName, category, color, size, sku, price, stock — description &amp; image optional.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  <Images size={14} />
                </span>
                <p className="text-xs font-semibold text-gray-800">Images (optional)</p>
              </div>

              <div className="mt-2.5 flex gap-1.5">
                <label className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-gray-300 px-1 text-[11px] font-medium text-gray-700 transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700">
                  <ImageUp size={13} />
                  Files
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleImageFilesSelected}
                  />
                </label>
                <label className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-gray-300 px-1 text-[11px] font-medium text-gray-700 transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700">
                  <FolderOpen size={13} />
                  Folder
                  <input
                    type="file"
                    // @ts-expect-error - non-standard attribute, Chrome/Edge/Safari support it
                    webkitdirectory=""
                    multiple
                    className="hidden"
                    onChange={handleImageFolderSelected}
                  />
                </label>
              </div>

              <p className="mt-1.5 text-[10px] leading-tight text-gray-400">
                Matched to products by the CSV&apos;s <code className="rounded bg-gray-100 px-0.5">image</code> column.
              </p>
            </div>
          </div>

          {parseError ? <Alert message={parseError} variant="error" /> : null}

          {pendingImages.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {pendingImages.map((img) => (
                <div key={img.id} className="relative h-10 w-10 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                  <Image src={img.previewUrl} alt={img.file.name} fill unoptimized sizes="40px" className="object-contain" />
                  <button
                    type="button"
                    onClick={() => removePendingImage(img.id)}
                    className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-bl bg-white/90 text-gray-500 hover:text-red-600"
                    title="Remove"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {pendingProducts.length > 0 ? (
            <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-medium text-blue-800">
              <PackageCheck size={14} className="shrink-0 text-[#087ff5]" />
              {pendingProducts.length} product{pendingProducts.length === 1 ? "" : "s"} · {totalVariants} variant(s)
              {pendingImages.length > 0 ? <> · {pendingImages.length} image(s)</> : null}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
          <Button type="button" onClick={goToReview} disabled={pendingProducts.length === 0}>
            Continue to review
          </Button>
        </div>
      </Modal>

      {alert ? <Alert message={alert.message} variant={alert.variant} onClose={closeAlert} /> : null}
    </>
  );
}
