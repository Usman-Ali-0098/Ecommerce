"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Alert from "@/components/ui/alert";
import { parseProductCsv } from "@/lib/csv";

type Category = { id: string; name: string; isActive: boolean };
type Color = { id: string; name: string; hexacode: string | null };
type Size = { id: string; name: string };

type DraftVariant = {
  tempId: string;
  colorId: string;
  colorLabel: string;
  sizeId: string;
  sizeLabel: string;
  sku: string;
  price: string;
  stock: string;
};

type DraftProduct = {
  tempId: string;
  name: string;
  description: string;
  categoryId: string;
  categoryLabel: string;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  variants: DraftVariant[];
};

type Props = {
  categories: Category[];
  colors: Color[];
  sizes: Size[];
};

let tempIdCounter = 0;
function nextTempId() {
  tempIdCounter += 1;
  return `tmp-${tempIdCounter}`;
}

function findByName<T extends { name: string }>(list: T[], name: string): T | undefined {
  const target = name.trim().toLowerCase();
  if (!target) return undefined;
  return list.find((item) => item.name.trim().toLowerCase() === target);
}

export default function ProductImportClient({ categories, colors, sizes }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setSubmitError(null);

    file.text().then((text) => {
      const { rows, error } = parseProductCsv(text);
      if (error) {
        setParseError(error);
        return;
      }

      const grouped = new Map<string, DraftVariant[]>();
      const productMeta = new Map<string, { description: string; category: string }>();

      for (const row of rows) {
        if (!row.productName) continue;
        const key = row.productName.trim();
        const color = findByName(colors, row.color);
        const size = findByName(sizes, row.size);

        if (!productMeta.has(key)) {
          productMeta.set(key, { description: row.description, category: row.category });
        }

        const variant: DraftVariant = {
          tempId: nextTempId(),
          colorId: color?.id ?? "",
          colorLabel: row.color,
          sizeId: size?.id ?? "",
          sizeLabel: row.size,
          sku: row.sku,
          price: row.price,
          stock: row.stock,
        };

        grouped.set(key, [...(grouped.get(key) ?? []), variant]);
      }

      const draftProducts: DraftProduct[] = Array.from(grouped.entries()).map(([name, variants]) => {
        const meta = productMeta.get(name);
        const category = findByName(categories, meta?.category ?? "");
        return {
          tempId: nextTempId(),
          name,
          description: meta?.description ?? "",
          categoryId: category?.id ?? "",
          categoryLabel: meta?.category ?? "",
          imageFile: null,
          imagePreviewUrl: null,
          variants,
        };
      });

      setProducts(draftProducts);
    });
  }

  function updateProduct(tempId: string, patch: Partial<DraftProduct>) {
    setProducts((current) => current.map((p) => (p.tempId === tempId ? { ...p, ...patch } : p)));
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
  }

  function removeVariant(productId: string, variantId: string) {
    setProducts((current) =>
      current.map((p) =>
        p.tempId !== productId ? p : { ...p, variants: p.variants.filter((v) => v.tempId !== variantId) },
      ),
    );
  }

  function addVariant(productId: string) {
    setProducts((current) =>
      current.map((p) =>
        p.tempId !== productId
          ? p
          : {
              ...p,
              variants: [
                ...p.variants,
                { tempId: nextTempId(), colorId: "", colorLabel: "", sizeId: "", sizeLabel: "", sku: "", price: "", stock: "" },
              ],
            },
      ),
    );
  }

  function addProduct() {
    setProducts((current) => [
      ...current,
      {
        tempId: nextTempId(),
        name: "",
        description: "",
        categoryId: "",
        categoryLabel: "",
        imageFile: null,
        imagePreviewUrl: null,
        variants: [{ tempId: nextTempId(), colorId: "", colorLabel: "", sizeId: "", sizeLabel: "", sku: "", price: "", stock: "" }],
      },
    ]);
  }

  function setProductImage(tempId: string, file: File | null) {
    updateProduct(tempId, {
      imageFile: file,
      imagePreviewUrl: file ? URL.createObjectURL(file) : null,
    });
  }

  async function uploadImage(file: File): Promise<{ url: string; publicId: string }> {
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
      setSubmitError("Add at least one product.");
      return;
    }

    for (const product of products) {
      if (!product.name.trim()) {
        setSubmitError("Every product needs a name.");
        return;
      }
      if (!product.categoryId) {
        setSubmitError(`"${product.name}" needs a valid category — select one from the dropdown.`);
        return;
      }
      if (product.variants.length === 0) {
        setSubmitError(`"${product.name}" needs at least one variant.`);
        return;
      }
      for (const variant of product.variants) {
        if (!variant.sku.trim() || !variant.price.trim() || !variant.stock.trim()) {
          setSubmitError(`"${product.name}": every variant needs a SKU, price, and stock.`);
          return;
        }
      }
    }

    const uploadedPublicIds: string[] = [];

    try {
      setSubmitting(true);

      const payloadProducts = [];
      for (const product of products) {
        let image: { url: string; publicId: string } | null = null;
        if (product.imageFile) {
          image = await uploadImage(product.imageFile);
          uploadedPublicIds.push(image.publicId);
        }

        payloadProducts.push({
          name: product.name.trim(),
          description: product.description,
          categoryId: product.categoryId,
          isActive: true,
          images: image
            ? [{ source: "new" as const, url: image.url, publicId: image.publicId, colorId: null, position: 0, isPrimary: true }]
            : [],
          variants: product.variants.map((v) => ({
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

      const response = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: payloadProducts }),
      });

      const body = await response.json();

      if (!response.ok || !body.success) {
        throw new Error(body.message ?? "Unable to start product import.");
      }

      router.push(`/admin/products/import/${body.data.jobId}`);
    } catch (error) {
      console.error("Product import submit error:", error);
      setSubmitError(error instanceof Error ? error.message : "Unable to start product import.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <label className="block text-xs font-medium text-gray-600">
          CSV file — one row per variant. Columns: productName, description, category, color, size,
          sku, price, stock.
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="mt-2 block text-sm"
        />
        {parseError && (
          <div className="mt-3">
            <Alert message={parseError} variant="error" />
          </div>
        )}
      </div>

      {products.length > 0 && (
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.tempId} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Product name
                    <input
                      value={product.name}
                      onChange={(e) => updateProduct(product.tempId, { name: e.target.value })}
                      className="mt-1 h-9 w-full rounded-md border border-gray-300 px-2.5 text-sm"
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-600">
                    Category
                    <select
                      value={product.categoryId}
                      onChange={(e) => updateProduct(product.tempId, { categoryId: e.target.value })}
                      className="mt-1 h-9 w-full rounded-md border border-gray-300 px-2.5 text-sm"
                    >
                      <option value="">
                        {product.categoryLabel ? `Not found: "${product.categoryLabel}" — pick one` : "Select category"}
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-gray-600 sm:col-span-2">
                    Description
                    <textarea
                      value={product.description}
                      onChange={(e) => updateProduct(product.tempId, { description: e.target.value })}
                      rows={2}
                      className="mt-1 w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeProduct(product.tempId)}
                  className="shrink-0 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Remove product
                </button>
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600">
                  Product image (optional — applies to the whole product; add per-variant images later
                  from the product edit page)
                </label>
                <div className="mt-1 flex items-center gap-3">
                  {product.imagePreviewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imagePreviewUrl} alt="" className="h-12 w-12 rounded-md border border-gray-200 object-cover" />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setProductImage(product.tempId, e.target.files?.[0] ?? null)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
                <table className="w-full min-w-150 border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2">Color</th>
                      <th className="px-3 py-2">Size</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Stock</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((variant) => (
                      <tr key={variant.tempId} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-3 py-2">
                          <select
                            value={variant.colorId}
                            onChange={(e) => updateVariant(product.tempId, variant.tempId, { colorId: e.target.value })}
                            className="h-8 w-full rounded-md border border-gray-300 px-1.5"
                          >
                            <option value="">{variant.colorLabel ? `"${variant.colorLabel}"?` : "—"}</option>
                            {colors.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={variant.sizeId}
                            onChange={(e) => updateVariant(product.tempId, variant.tempId, { sizeId: e.target.value })}
                            className="h-8 w-full rounded-md border border-gray-300 px-1.5"
                          >
                            <option value="">{variant.sizeLabel ? `"${variant.sizeLabel}"?` : "—"}</option>
                            {sizes.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={variant.sku}
                            onChange={(e) => updateVariant(product.tempId, variant.tempId, { sku: e.target.value })}
                            className="h-8 w-24 rounded-md border border-gray-300 px-1.5"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={variant.price}
                            onChange={(e) => updateVariant(product.tempId, variant.tempId, { price: e.target.value })}
                            className="h-8 w-20 rounded-md border border-gray-300 px-1.5"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={variant.stock}
                            onChange={(e) => updateVariant(product.tempId, variant.tempId, { stock: e.target.value })}
                            className="h-8 w-16 rounded-md border border-gray-300 px-1.5"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeVariant(product.tempId, variant.tempId)}
                            className="text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => addVariant(product.tempId)}
                className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
              >
                + Add variant
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addProduct}
          className="h-9 rounded-lg border border-gray-300 px-3.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          + Add product manually
        </button>
        {products.length > 0 && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {submitting ? "Starting import..." : `Import ${products.length} product${products.length === 1 ? "" : "s"}`}
          </button>
        )}
      </div>

      {submitError && <Alert message={submitError} variant="error" />}
    </div>
  );
}
