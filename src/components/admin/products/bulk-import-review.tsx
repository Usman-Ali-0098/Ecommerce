"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";

import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";

import { useAlert } from "@/hooks/use-alert";
import { useBulkImportStore } from "@/components/admin/products/bulk-import-store";
import {
  makeBlankProduct,
  nextTempId,
  skuPart,
  type CategoryOption,
  type ColorOption,
  type DraftProduct,
  type DraftVariant,
  type SizeOption,
} from "@/lib/bulk-import-types";

const inputBase =
  "rounded-md border border-gray-300 bg-white text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500";

type ExistingSkuInfo = { productId: string; productName: string };
type BuilderState = { colorId: string; sizeId: string; qty: string };

// A product with no variants yet submits as a simple product using baseSku
// as its own SKU — check that one too, not just per-variant SKUs.
function effectiveSkusFor(product: DraftProduct): string[] {
  if (product.variants.length === 0) {
    return product.baseSku.trim() ? [product.baseSku.trim().toUpperCase()] : [];
  }
  return product.variants.map((v) => v.sku.trim().toUpperCase()).filter(Boolean);
}

export default function BulkImportReview() {
  const router = useRouter();
  const { alert, showAlert, closeAlert } = useAlert();
  const store = useBulkImportStore();

  const {
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
  } = store;

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<
    { phase: "images"; current: number; total: number } | { phase: "creating" } | null
  >(null);
  const [builders, setBuilders] = useState<Record<string, BuilderState>>({});
  const [existingSkus, setExistingSkus] = useState<Map<string, ExistingSkuInfo>>(new Map());

  const allSkusKey = useMemo(
    () =>
      products
        .flatMap((p) => effectiveSkusFor(p))
        .filter(Boolean)
        .sort()
        .join(","),
    [products],
  );

  useEffect(() => {
    const skus = allSkusKey ? allSkusKey.split(",") : [];
    if (skus.length === 0) return;

    const timer = window.setTimeout(() => {
      fetch("/api/admin/products/check-skus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skus }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => {
          if (!body?.success) return;
          const map = new Map<string, ExistingSkuInfo>();
          for (const row of body.data.existing) {
            map.set(row.sku, { productId: row.productId, productName: row.productName });
          }
          setExistingSkus(map);
        })
        .catch(() => {
          // transient network hiccup — the check just won't show until it succeeds
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [allSkusKey]);

  function submitStatusText() {
    if (!uploadProgress) return "Checking import service...";
    if (uploadProgress.phase === "images") {
      return uploadProgress.total > 0
        ? `Uploading images... (${uploadProgress.current}/${uploadProgress.total})`
        : "Starting import...";
    }
    return "Creating import job...";
  }

  function getBuilder(tempId: string): BuilderState {
    return builders[tempId] ?? { colorId: "", sizeId: "", qty: "" };
  }

  function updateBuilder(tempId: string, patch: Partial<BuilderState>) {
    setBuilders((current) => ({ ...current, [tempId]: { ...getBuilder(tempId), ...patch } }));
  }

  const imageSummary = useMemo(() => {
    const totalVariants = products.reduce((sum, p) => sum + p.variants.length, 0);
    const expectedImages = products.filter((p) => p.variants.some((v) => v.imageFilenameFromCsv)).length;
    const matchedImages = products.filter((p) => images.some((img) => img.assignedToProductTempId === p.tempId)).length;
    const missing = products.filter((p) => p.unmatchedImageFilenames.length > 0);
    const unassigned = images.filter((img) => !img.assignedToProductTempId);

    return { totalVariants, expectedImages, matchedImages, missing, unassigned };
  }, [products, images]);

  function updateProduct(tempId: string, patch: Partial<DraftProduct>) {
    setProducts((current) => current.map((p) => (p.tempId === tempId ? { ...p, ...patch } : p)));
  }

  // Only sets the default price used when a new variant is added via the
  // builder below — existing variants keep their own independently-editable
  // price untouched.
  function updatePrice(tempId: string, price: string) {
    updateProduct(tempId, { price });
  }

  function updateVariant(productId: string, variantId: string, patch: Partial<DraftVariant>) {
    setProducts((current) =>
      current.map((p) =>
        p.tempId !== productId
          ? p
          : { ...p, variants: p.variants.map((v) => (v.tempId === variantId ? { ...v, ...patch } : v)) },
      ),
    );
  }

  function removeProduct(tempId: string) {
    setProducts((current) => current.filter((p) => p.tempId !== tempId));
    setImages((current) =>
      current.map((img) => (img.assignedToProductTempId === tempId ? { ...img, assignedToProductTempId: null } : img)),
    );
  }

  function removeVariant(productId: string, variantId: string) {
    setProducts((current) =>
      current.map((p) =>
        p.tempId !== productId ? p : { ...p, variants: p.variants.filter((v) => v.tempId !== variantId) },
      ),
    );
  }

  function addBlankProduct() {
    setProducts((current) => [...current, makeBlankProduct()]);
  }

  function addVariantFromBuilder(product: DraftProduct) {
    const builder = getBuilder(product.tempId);

    if (!builder.colorId && !builder.sizeId) {
      showAlert("Select at least a color or size.", { variant: "warning" });
      return;
    }
    const qty = Number(builder.qty);
    if (!Number.isInteger(qty) || qty < 0) {
      showAlert("Enter a valid quantity.", { variant: "warning" });
      return;
    }
    if (!product.price.trim() || !Number.isInteger(Number(product.price)) || Number(product.price) <= 0) {
      showAlert("Enter a whole-rupee price for this product before adding a variant.", { variant: "warning" });
      return;
    }

    const color = colorOptions.find((c) => c.id === builder.colorId);
    const size = sizeOptions.find((s) => s.id === builder.sizeId);

    const alreadyExists = product.variants.some(
      (v) => v.colorId === (color?.id ?? "") && v.sizeId === (size?.id ?? ""),
    );
    if (alreadyExists) {
      showAlert("This color and size combination already exists.", { variant: "warning" });
      return;
    }

    const skuParts = [skuPart(product.baseSku || product.name || "PRODUCT")];
    if (color?.name) skuParts.push(skuPart(color.name));
    if (size?.name) skuParts.push(skuPart(size.name));

    const variant: DraftVariant = {
      tempId: nextTempId(),
      colorId: color?.id ?? "",
      colorLabel: color?.name ?? "",
      showNewColor: false,
      newColorName: "",
      newColorHex: "#000000",
      isAddingColor: false,
      sizeId: size?.id ?? "",
      sizeLabel: size?.name ?? "",
      showNewSize: false,
      newSizeName: "",
      newSizeSortOrder: "0",
      isAddingSize: false,
      sku: skuParts.join("-"),
      price: product.price,
      stock: builder.qty,
      imageFilenameFromCsv: "",
    };

    setProducts((current) =>
      current.map((p) => (p.tempId === product.tempId ? { ...p, variants: [...p.variants, variant] } : p)),
    );
    setBuilders((current) => ({ ...current, [product.tempId]: { colorId: "", sizeId: "", qty: "" } }));
  }

  function assignImage(imageId: string, productTempId: string | null) {
    setImages((current) => {
      const hasOtherImageForProduct = productTempId
        ? current.some((img) => img.id !== imageId && img.assignedToProductTempId === productTempId)
        : false;

      return current.map((img) =>
        img.id === imageId
          ? {
              ...img,
              assignedToProductTempId: productTempId,
              isPrimary: productTempId ? !hasOtherImageForProduct : false,
              colorId: productTempId ? img.colorId : null,
            }
          : img,
      );
    });
  }

  function setImageColor(imageId: string, colorId: string | null) {
    setImages((current) => current.map((img) => (img.id === imageId ? { ...img, colorId } : img)));
  }

  function addDirectProductImage(product: DraftProduct, file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showAlert(`${file.name} is not a supported image.`, { variant: "warning" });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    store.trackObjectUrl(previewUrl);
    const hasImages = images.some((img) => img.assignedToProductTempId === product.tempId);

    setImages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        file,
        previewUrl,
        assignedToProductTempId: product.tempId,
        colorId: null,
        isPrimary: !hasImages,
      },
    ]);
  }

  function removeImage(imageId: string) {
    const image = images.find((img) => img.id === imageId);
    if (image) URL.revokeObjectURL(image.previewUrl);
    setImages((current) => current.filter((img) => img.id !== imageId));
  }

  // Live preview next to a variant's color select: the image on this
  // product tagged with that exact color, falling back to the product's
  // primary/general image if no color-specific one has been tagged yet.
  function matchedImageFor(productTempId: string, colorId: string) {
    const productImages = images.filter((img) => img.assignedToProductTempId === productTempId);
    if (productImages.length === 0) return null;
    if (colorId) {
      const byColor = productImages.find((img) => img.colorId === colorId);
      if (byColor) return byColor;
    }
    return productImages.find((img) => img.isPrimary) ?? productImages[0];
  }

  async function createCategory(product: DraftProduct) {
    const name = product.newCategoryName.trim();
    if (!name) {
      showAlert("Enter a category name.", { variant: "warning" });
      return;
    }

    try {
      updateProduct(product.tempId, { isAddingCategory: true });

      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();

      if (!response.ok) {
        showAlert(result.message ?? "Unable to add category.", { variant: "error" });
        updateProduct(product.tempId, { isAddingCategory: false });
        return;
      }

      const category = result.data.category as CategoryOption;
      setCategoryOptions((current) => [...current, category]);

      const matchTarget = name.toLowerCase();
      setProducts((current) =>
        current.map((p) =>
          p.categoryLabel.trim().toLowerCase() === matchTarget || p.tempId === product.tempId
            ? { ...p, categoryId: category.id, showNewCategory: false, isAddingCategory: false }
            : p,
        ),
      );

      showAlert("Category added.", { variant: "success" });
    } catch (error) {
      console.error("Add category error:", error);
      showAlert("Something went wrong while adding the category.", { variant: "error" });
      updateProduct(product.tempId, { isAddingCategory: false });
    }
  }

  async function createColor(product: DraftProduct, variant: DraftVariant) {
    const name = variant.newColorName.trim();
    if (!name) {
      showAlert("Enter a color name.", { variant: "warning" });
      return;
    }

    try {
      updateVariant(product.tempId, variant.tempId, { isAddingColor: true });

      const response = await fetch("/api/admin/colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, hexacode: variant.newColorHex }),
      });
      const result = await response.json();

      if (!response.ok) {
        showAlert(result.message ?? "Unable to add color.", { variant: "error" });
        updateVariant(product.tempId, variant.tempId, { isAddingColor: false });
        return;
      }

      const color = result.data as ColorOption;
      setColorOptions((current) => [...current, color].sort((a, b) => a.name.localeCompare(b.name)));

      const matchTarget = name.toLowerCase();
      setProducts((current) =>
        current.map((p) => ({
          ...p,
          variants: p.variants.map((v) =>
            v.colorLabel.trim().toLowerCase() === matchTarget || v.tempId === variant.tempId
              ? { ...v, colorId: color.id, showNewColor: false, isAddingColor: false }
              : v,
          ),
        })),
      );

      showAlert("Color added.", { variant: "success" });
    } catch (error) {
      console.error("Add color error:", error);
      showAlert("Something went wrong while adding the color.", { variant: "error" });
      updateVariant(product.tempId, variant.tempId, { isAddingColor: false });
    }
  }

  async function createSize(product: DraftProduct, variant: DraftVariant) {
    const name = variant.newSizeName.trim();
    const sortOrder = Number(variant.newSizeSortOrder);

    if (!name) {
      showAlert("Enter a size name.", { variant: "warning" });
      return;
    }
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      showAlert("Sort order must be a whole number of 0 or greater.", { variant: "warning" });
      return;
    }

    try {
      updateVariant(product.tempId, variant.tempId, { isAddingSize: true });

      const response = await fetch("/api/admin/sizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sortOrder }),
      });
      const result = await response.json();

      if (!response.ok) {
        showAlert(result.message ?? "Unable to add size.", { variant: "error" });
        updateVariant(product.tempId, variant.tempId, { isAddingSize: false });
        return;
      }

      const size = result.data as SizeOption;
      setSizeOptions((current) =>
        [...current, size].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
      );

      const matchTarget = name.toLowerCase();
      setProducts((current) =>
        current.map((p) => ({
          ...p,
          variants: p.variants.map((v) =>
            v.sizeLabel.trim().toLowerCase() === matchTarget || v.tempId === variant.tempId
              ? { ...v, sizeId: size.id, showNewSize: false, isAddingSize: false }
              : v,
          ),
        })),
      );

      showAlert("Size added.", { variant: "success" });
    } catch (error) {
      console.error("Add size error:", error);
      showAlert("Something went wrong while adding the size.", { variant: "error" });
      updateVariant(product.tempId, variant.tempId, { isAddingSize: false });
    }
  }

  async function uploadProductImage(file: File): Promise<{ url: string; publicId: string }> {
    const signatureResponse = await fetch("/api/admin/cloudinary-signature", { method: "POST" });
    const signatureData = await signatureResponse.json();

    if (!signatureResponse.ok || !signatureData.success) {
      throw new Error(signatureData.message ?? "Unable to authorize image upload.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signatureData.apiKey);
    formData.append("timestamp", String(signatureData.timestamp));
    formData.append("folder", signatureData.folder);
    formData.append("signature", signatureData.signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`;
    const response = await fetch(uploadUrl, { method: "POST", body: formData });
    const result = await response.json();

    if (!response.ok || !result.secure_url || !result.public_id) {
      throw new Error(result.error?.message ?? `Unable to upload ${file.name}.`);
    }

    return { url: result.secure_url, publicId: result.public_id };
  }

  async function handleSubmit() {
    setSubmitError(null);

    if (products.length === 0) {
      setSubmitError("Nothing to import.");
      return;
    }

    for (const product of products) {
      if (!product.name.trim()) {
        setSubmitError("Every product needs a name.");
        return;
      }
      if (!product.categoryId) {
        setSubmitError(`"${product.name}" needs a category — select one or create it from the dropdown.`);
        return;
      }
      if (product.variants.length === 0) {
        if (!product.baseSku.trim()) {
          setSubmitError(`"${product.name}" needs a SKU (no variants have been added yet).`);
          return;
        }
        if (!product.price.trim() || !product.quantity.trim()) {
          setSubmitError(`"${product.name}" needs a price and quantity.`);
          return;
        }
      } else {
        for (const variant of product.variants) {
          if (!variant.sku.trim() || !variant.price.trim() || !variant.stock.trim()) {
            setSubmitError(`"${product.name}": every variant needs a SKU, price, and stock.`);
            return;
          }
        }
      }
    }

    setSubmitting(true);

    try {
      const health = await fetch("/api/admin/jobs/health").then((r) => r.json().catch(() => null));
      if (!health?.success) {
        setSubmitError(
          "The import service is unreachable right now — nothing was uploaded. Make sure it's running and try again.",
        );
        setSubmitting(false);
        return;
      }
    } catch {
      setSubmitError("Couldn't reach the server to check the import service. Please try again.");
      setSubmitting(false);
      return;
    }

    const uploadedPublicIds: string[] = [];

    try {
      const totalImages = images.filter((img) => img.assignedToProductTempId).length;
      let uploadedCount = 0;
      setUploadProgress({ phase: "images", current: 0, total: totalImages });

      const payloadProducts = [];
      for (const product of products) {
        const productImages = images.filter((img) => img.assignedToProductTempId === product.tempId);
        const uploadedImages = [];
        for (const img of productImages) {
          const uploaded = await uploadProductImage(img.file);
          uploadedPublicIds.push(uploaded.publicId);
          uploadedImages.push({
            source: "new" as const,
            url: uploaded.url,
            publicId: uploaded.publicId,
            colorId: img.colorId,
            isPrimary: img.isPrimary,
          });
          uploadedCount += 1;
          setUploadProgress({ phase: "images", current: uploadedCount, total: totalImages });
        }

        payloadProducts.push({
          name: product.name.trim(),
          description: product.description,
          categoryId: product.categoryId,
          isActive: true,
          images: uploadedImages.map((img, position) => ({ ...img, position })),
          variants:
            product.variants.length === 0
              ? [
                  {
                    sku: product.baseSku.trim().toUpperCase(),
                    price: Number(product.price),
                    stock: Number(product.quantity),
                    colorId: null,
                    sizeId: null,
                    imageUrl: null,
                    imagePublicId: null,
                  },
                ]
              : product.variants.map((v) => ({
                  sku: v.sku,
                  price: Number(v.price),
                  stock: Number(v.stock),
                  colorId: v.colorId || null,
                  sizeId: v.sizeId || null,
                  imageUrl: null,
                  imagePublicId: null,
                })),
        });
      }

      setUploadProgress({ phase: "creating" });

      const response = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: payloadProducts }),
      });

      const body = await response.json();

      if (!response.ok || !body.success) {
        throw new Error(body.message ?? "Unable to start product import.");
      }

      const jobId = body.data.jobId as string;
      store.clearDraft();
      router.push(`/admin/products/import/${jobId}`);
    } catch (error) {
      console.error("Bulk import submit error:", error);

      if (uploadedPublicIds.length > 0) {
        try {
          await fetch("/api/admin/cloudinary-signature", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicIds: uploadedPublicIds }),
          });
        } catch (cleanupError) {
          console.error("Cloudinary cleanup after failed import error:", cleanupError);
        }
      }

      setSubmitError(error instanceof Error ? error.message : "Unable to start product import.");
    } finally {
      setUploadProgress(null);
      setSubmitting(false);
    }
  }

  if (products.length === 0) {
    return (
      <section className="mx-auto max-w-xl py-16 text-center">
        <p className="text-sm font-medium text-gray-800">No products to review.</p>
        <p className="mt-1 text-xs text-gray-500">
          Start a bulk import from the Products page — upload a CSV there first.
        </p>
        <Link
          href="/admin/products"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700"
        >
          Back to Products
        </Link>
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-start gap-2.5">
          <Link
            href="/admin/products"
            aria-label="Back to products"
            className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition hover:bg-blue-50"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Bulk Add Products ({products.length})</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Review pre-filled CSV data, add images, edit details, then submit to queue tasks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addBlankProduct}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus size={14} />
            Add Product Card
          </button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? submitStatusText() : "Submit All Products"}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl">
        {imageSummary.missing.length > 0 ? (
          <div className="mb-4 rounded-lg bg-amber-50 px-3.5 py-2.5 text-[11px] font-medium text-amber-700">
            Missing images: {imageSummary.missing.flatMap((p) => p.unmatchedImageFilenames).join(", ")}
          </div>
        ) : null}

        <div className="space-y-4">
        {products.map((product, index) => {
          const productImages = images.filter((img) => img.assignedToProductTempId === product.tempId);
          const totalQuantity = product.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
          const builder = getBuilder(product.tempId);

          const productSkus = effectiveSkusFor(product);
          const existingMatch = productSkus.map((sku) => existingSkus.get(sku)).find((match) => match);
          const matchedSku = productSkus.find((sku) => existingSkus.get(sku) === existingMatch);

          return (
            <div key={product.tempId} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
              {/* Card header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                    <span className="text-base font-semibold text-gray-900">{product.name || "Untitled product"}</span>
                    {existingMatch ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        Update Product
                      </span>
                    ) : null}
                  </div>
                  {existingMatch ? (
                    <p className="mt-1 text-xs text-gray-500">
                      SKU <code className="rounded bg-gray-100 px-1 py-0.5">{matchedSku}</code> already exists — we
                      will update this product, not create a new one.
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => removeProduct(product.tempId)}
                  title="Remove product"
                  className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Body: image column + fields column */}
              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                {/* Images */}
                <div>
                  <p className="mb-1.5 text-xs text-gray-500">
                    Product Images <span className="text-gray-400">(optional{existingMatch ? " — keep existing" : ""})</span>
                  </p>

                  <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-600">
                    <Upload size={16} />
                    <span className="text-[11px]">Add more images (optional)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) addDirectProductImage(product, file);
                      }}
                    />
                  </label>

                  {productImages.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      {productImages.map((img) => (
                        <div key={img.id}>
                          <div
                            className={`relative aspect-square overflow-hidden rounded-lg border bg-gray-50 ${
                              img.isPrimary ? "border-blue-500 ring-1 ring-blue-200" : "border-gray-200"
                            }`}
                          >
                            <Image src={img.previewUrl} alt="" fill unoptimized sizes="130px" className="object-contain" />
                            <button
                              type="button"
                              onClick={() => assignImage(img.id, null)}
                              title="Remove image"
                              className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                            >
                              <X size={11} />
                            </button>
                          </div>
                          <select
                            value={img.colorId ?? ""}
                            onChange={(e) => setImageColor(img.id, e.target.value || null)}
                            className={`mt-1 h-7 w-full px-1.5 text-[10px] ${inputBase}`}
                          >
                            <option value="">{img.isPrimary ? "General image" : "Select color"}</option>
                            {colorOptions.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  ) : product.unmatchedImageFilenames.length > 0 ? (
                    <p className="mt-2 text-[10px] text-amber-600">
                      {product.unmatchedImageFilenames.map((f) => `"${f}"`).join(", ")} wasn&apos;t found among the
                      uploaded images.
                    </p>
                  ) : null}
                </div>

                {/* Fields */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Product Name <span className="text-red-500">*</span>
                    <input
                      value={product.name}
                      onChange={(e) => updateProduct(product.tempId, { name: e.target.value })}
                      placeholder="Product name"
                      className={`mt-1 h-8 w-full px-2.5 text-sm ${inputBase}`}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-medium text-gray-600">
                      {product.variants.length > 0 ? "Default Price for New Variants" : "Price"}{" "}
                      <span className="text-red-500">*</span>
                      <input
                        value={product.price}
                        onChange={(e) => updatePrice(product.tempId, e.target.value)}
                        placeholder="0"
                        className={`mt-1 h-8 w-full px-2.5 text-sm ${inputBase}`}
                      />
                      {product.variants.length > 0 ? (
                        <span className="mt-1 block text-[10px] text-gray-400">
                          Applied to new variants — existing variant prices are edited below.
                        </span>
                      ) : null}
                    </label>
                    <label className="block text-xs font-medium text-gray-600">
                      Total Quantity
                      <input
                        value={product.variants.length > 0 ? totalQuantity : product.quantity}
                        onChange={(e) => updateProduct(product.tempId, { quantity: e.target.value })}
                        readOnly={product.variants.length > 0}
                        placeholder="0"
                        className={`mt-1 h-8 w-full px-2.5 text-sm ${
                          product.variants.length > 0 ? "cursor-default bg-gray-50 text-gray-600" : "bg-white"
                        } ${inputBase}`}
                      />
                      {product.variants.length > 0 ? (
                        <span className="mt-1 block text-[10px] text-gray-400">
                          Sum of variant quantities — edit qtys below to update stock.
                        </span>
                      ) : null}
                    </label>
                  </div>

                  <label className="block text-xs font-medium text-gray-600">
                    Base SKU <span className="text-red-500">*</span>
                    <input
                      value={product.baseSku}
                      onChange={(e) => updateProduct(product.tempId, { baseSku: e.target.value })}
                      placeholder="PRODUCT-001"
                      className={`mt-1 h-8 w-full px-2.5 text-sm ${inputBase}`}
                    />
                    <span className="mt-1 block text-[10px] text-gray-400">
                      Used as the SKU if this product has no variants, and as the base when generating a variant SKU
                      below.
                    </span>
                  </label>

                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={product.showNewCategory ? "__new__" : product.categoryId}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "__new__") {
                          updateProduct(product.tempId, { showNewCategory: true });
                          return;
                        }
                        updateProduct(product.tempId, { showNewCategory: false, categoryId: value });
                      }}
                      className={`mt-1 h-8 w-full px-2.5 text-sm ${inputBase}`}
                    >
                      <option value="">
                        {product.categoryLabel && !product.categoryId ? `"${product.categoryLabel}"?` : "Select Category"}
                      </option>
                      {categoryOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      <option value="__new__">+ Add New Category</option>
                    </select>

                    {product.showNewCategory ? (
                      <div className="mt-1.5 flex gap-1.5 rounded-md border border-blue-100 bg-blue-50/40 p-1.5">
                        <input
                          type="text"
                          value={product.newCategoryName}
                          onChange={(e) => updateProduct(product.tempId, { newCategoryName: e.target.value })}
                          disabled={product.isAddingCategory}
                          className={`h-8 min-w-0 flex-1 px-2 text-xs disabled:bg-gray-50 ${inputBase}`}
                        />
                        <button
                          type="button"
                          onClick={() => void createCategory(product)}
                          disabled={product.isAddingCategory || !product.newCategoryName.trim()}
                          className="inline-flex h-8 shrink-0 items-center gap-1 rounded bg-blue-600 px-2 text-[10px] font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
                        >
                          {product.isAddingCategory ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                          Add
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Variant builder */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Add Product Variants <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_90px_36px] gap-2">
                      <select
                        value={builder.colorId}
                        onChange={(e) => updateBuilder(product.tempId, { colorId: e.target.value })}
                        className={`h-9 w-full px-2 text-xs ${inputBase}`}
                      >
                        <option value="">Select Color</option>
                        {colorOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={builder.sizeId}
                        onChange={(e) => updateBuilder(product.tempId, { sizeId: e.target.value })}
                        className={`h-9 w-full px-2 text-xs ${inputBase}`}
                      >
                        <option value="">Select Size</option>
                        {sizeOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <input
                        value={builder.qty}
                        onChange={(e) => updateBuilder(product.tempId, { qty: e.target.value })}
                        placeholder="Enter Qty"
                        className={`h-9 w-full px-2 text-xs ${inputBase}`}
                      />
                      <button
                        type="button"
                        onClick={() => addVariantFromBuilder(product)}
                        title="Add variant"
                        className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Variant list */}
                  {product.variants.length > 0 ? (
                    <div className="space-y-2">
                      {product.variants.map((variant) => {
                        const existing = existingSkus.get(variant.sku.trim().toUpperCase());
                        return (
                          <div key={variant.tempId} className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                            <div className="mb-1.5 flex items-center justify-between">
                              {existing ? (
                                <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">
                                  EXISTING VARIANT
                                </span>
                              ) : (
                                <span />
                              )}
                              <button
                                type="button"
                                onClick={() => removeVariant(product.tempId, variant.tempId)}
                                title="Remove variant"
                                className="flex h-6 w-6 items-center justify-center text-gray-400 hover:text-red-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-1.5">
                                {(() => {
                                  const matched = matchedImageFor(product.tempId, variant.colorId);
                                  return (
                                    <div
                                      className="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100"
                                      title={matched ? "Matches this variant's color" : "No image tagged for this color yet"}
                                    >
                                      {matched ? (
                                        <Image src={matched.previewUrl} alt="" fill unoptimized sizes="32px" className="object-contain" />
                                      ) : null}
                                    </div>
                                  );
                                })()}
                                <select
                                  value={variant.showNewColor ? "__new__" : variant.colorId}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "__new__") {
                                      updateVariant(product.tempId, variant.tempId, { showNewColor: true });
                                      return;
                                    }
                                    updateVariant(product.tempId, variant.tempId, { showNewColor: false, colorId: value });
                                  }}
                                  className={`h-8 min-w-0 flex-1 px-1.5 text-xs ${inputBase}`}
                                >
                                  <option value="">
                                    {variant.colorLabel && !variant.colorId ? `"${variant.colorLabel}"?` : "—"}
                                  </option>
                                  {colorOptions.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                  <option value="__new__">+ New Color</option>
                                </select>
                              </div>

                              <select
                                value={variant.showNewSize ? "__new__" : variant.sizeId}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "__new__") {
                                    updateVariant(product.tempId, variant.tempId, { showNewSize: true });
                                    return;
                                  }
                                  updateVariant(product.tempId, variant.tempId, { showNewSize: false, sizeId: value });
                                }}
                                className={`h-8 w-full px-1.5 text-xs ${inputBase}`}
                              >
                                <option value="">
                                  {variant.sizeLabel && !variant.sizeId ? `"${variant.sizeLabel}"?` : "Free Size"}
                                </option>
                                {sizeOptions.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                                <option value="__new__">+ New Size</option>
                              </select>
                            </div>

                            {variant.showNewColor ? (
                              <div className="mt-1.5 flex max-w-xs gap-1 rounded-md border border-blue-100 bg-blue-50/40 p-1">
                                <input
                                  value={variant.newColorName}
                                  onChange={(e) =>
                                    updateVariant(product.tempId, variant.tempId, { newColorName: e.target.value })
                                  }
                                  disabled={variant.isAddingColor}
                                  placeholder="Color name"
                                  className={`h-6 min-w-0 flex-1 px-1.5 text-[10px] disabled:bg-gray-50 ${inputBase}`}
                                />
                                <input
                                  type="color"
                                  value={variant.newColorHex}
                                  onChange={(e) =>
                                    updateVariant(product.tempId, variant.tempId, { newColorHex: e.target.value })
                                  }
                                  disabled={variant.isAddingColor}
                                  className="h-6 w-7 rounded border border-gray-200 bg-white p-0.5"
                                />
                                <button
                                  type="button"
                                  onClick={() => void createColor(product, variant)}
                                  disabled={variant.isAddingColor || !variant.newColorName.trim()}
                                  className="inline-flex h-6 shrink-0 items-center rounded bg-blue-600 px-1.5 text-[9px] font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
                                >
                                  {variant.isAddingColor ? <Loader2 size={9} className="animate-spin" /> : "Add"}
                                </button>
                              </div>
                            ) : null}

                            {variant.showNewSize ? (
                              <div className="mt-1.5 flex max-w-50 gap-1 rounded-md border border-blue-100 bg-blue-50/40 p-1">
                                <input
                                  value={variant.newSizeName}
                                  onChange={(e) =>
                                    updateVariant(product.tempId, variant.tempId, { newSizeName: e.target.value })
                                  }
                                  disabled={variant.isAddingSize}
                                  placeholder="Size name"
                                  className={`h-6 min-w-0 flex-1 px-1.5 text-[10px] disabled:bg-gray-50 ${inputBase}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => void createSize(product, variant)}
                                  disabled={variant.isAddingSize || !variant.newSizeName.trim()}
                                  className="inline-flex h-6 shrink-0 items-center rounded bg-blue-600 px-1.5 text-[9px] font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
                                >
                                  {variant.isAddingSize ? <Loader2 size={9} className="animate-spin" /> : "Add"}
                                </button>
                              </div>
                            ) : null}

                            <div className="mt-2 grid grid-cols-3 gap-2">
                              <label className="block text-[9px] font-medium text-gray-500">
                                SKU
                                <input
                                  value={variant.sku}
                                  onChange={(e) => updateVariant(product.tempId, variant.tempId, { sku: e.target.value })}
                                  className={`mt-0.5 h-8 w-full px-1.5 text-xs ${inputBase}`}
                                />
                              </label>
                              <label className="block text-[9px] font-medium text-gray-500">
                                Price
                                <input
                                  value={variant.price}
                                  onChange={(e) => updateVariant(product.tempId, variant.tempId, { price: e.target.value })}
                                  className={`mt-0.5 h-8 w-full px-1.5 text-xs ${inputBase}`}
                                />
                              </label>
                              <label className="block text-[9px] font-medium text-gray-500">
                                Stock
                                <input
                                  value={variant.stock}
                                  onChange={(e) => updateVariant(product.tempId, variant.tempId, { stock: e.target.value })}
                                  className={`mt-0.5 h-8 w-full px-1.5 text-xs ${inputBase}`}
                                />
                              </label>
                            </div>
                            {existing ? (
                              <p className="mt-1 text-[10px] font-medium text-blue-600">
                                Matches an existing SKU — will update
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed border-gray-200 bg-gray-50/70 px-3 py-2 text-[11px] text-gray-400">
                      No variants yet — add one above.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Unassigned images tray */}
        {imageSummary.unassigned.length > 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-600">{imageSummary.unassigned.length} unassigned image(s)</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {imageSummary.unassigned.map((img) => (
                <div key={img.id} className="w-28">
                  <div className="relative h-20 w-28 overflow-hidden rounded-md border border-gray-200 bg-white">
                    <Image src={img.previewUrl} alt={img.file.name} fill unoptimized sizes="112px" className="object-contain" />
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-gray-500 hover:text-red-600"
                    >
                      <X size={11} />
                    </button>
                  </div>
                  <p className="mt-1 truncate text-[9px] text-gray-500" title={img.file.name}>
                    {img.file.name}
                  </p>
                  <select
                    value=""
                    onChange={(e) => e.target.value && assignImage(img.id, e.target.value)}
                    className={`mt-1 h-7 w-full px-1 text-[10px] ${inputBase}`}
                  >
                    <option value="">Assign to...</option>
                    {products.map((p) => (
                      <option key={p.tempId} value={p.tempId}>
                        {p.name || "(unnamed)"}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {submitError ? <Alert message={submitError} variant="error" /> : null}

        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <Link href="/admin/products" className="text-xs font-medium text-gray-600 hover:underline">
            Cancel
          </Link>

          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting
              ? submitStatusText()
              : `Import ${products.length} product${products.length === 1 ? "" : "s"}`}
          </Button>
        </div>
        </div>
      </div>

      {alert ? <Alert message={alert.message} variant={alert.variant} onClose={closeAlert} /> : null}

      {submitting ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-900/60 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <Loader2 size={22} className="animate-spin text-blue-600" />
            </div>

            <p className="mt-4 text-sm font-semibold text-gray-900">
              {uploadProgress?.phase === "images"
                ? "Uploading Your Images"
                : uploadProgress?.phase === "creating"
                  ? "Creating Your Products"
                  : "Getting Ready"}
            </p>
            <p className="mt-1 text-xs text-gray-500">{submitStatusText()}</p>

            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out ${
                  uploadProgress?.phase === "creating" || !uploadProgress || uploadProgress.total === 0
                    ? "w-full animate-pulse"
                    : ""
                }`}
                style={
                  uploadProgress?.phase === "images" && uploadProgress.total > 0
                    ? { width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` }
                    : undefined
                }
              />
            </div>

            {uploadProgress?.phase === "images" && uploadProgress.total > 0 ? (
              <p className="mt-1.5 text-right text-[10px] font-semibold text-blue-600">
                {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
              </p>
            ) : null}

            <p className="mt-4 text-[11px] text-gray-400">Please don&apos;t close this tab while this finishes.</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
