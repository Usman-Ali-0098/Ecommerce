"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

import { ArrowLeft, ImageUp, Loader2, Plus, Trash2, X } from "lucide-react";

import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";

import { useAlert } from "@/hooks/use-alert";
import Image from "next/image";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

type ColorOption = {
  id: string;
  name: string;
  hexacode: string | null;
  isActive?: boolean;
};

type SizeOption = {
  id: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};

type InitialVariant = {
  id: string;
  sku: string;
  price: number;
  stock: number;

  colorId: string | null;
  colorName: string | null;

  sizeId: string | null;
  sizeName: string | null;

  imageUrl?: string | null;
  imagePublicId?: string | null;
};

type InitialImage = {
  id: string;
  url: string;
  publicId: string | null;
  isPrimary: boolean;
  position: number;
};

type ProductInitialData = {
  id: string;

  name: string;
  description: string;

  categoryId: string;

  isActive: boolean;

  images: InitialImage[];

  baseSku: string;

  variants: InitialVariant[];
};

type AdminProductFormProps = {
  categories: CategoryOption[];
  colors: ColorOption[];
  sizes: SizeOption[];

  initialData?: ProductInitialData;
};

type AddedVariant = {
  id: string;

  existingVariantId?: string;

  sku: string;

  colorId: string | null;
  colorName: string | null;

  sizeId: string | null;
  sizeName: string | null;

  quantity: number;

  existingImageUrl?: string | null;
  existingImagePublicId?: string | null;

  selectedImage?: SelectedVariantImage | null;
};

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type SelectedVariantImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type UploadedImage = {
  localId: string;
  url: string;
  publicId: string;
};

type CloudinarySignatureResponse = {
  success: boolean;
  cloudName?: string;
  apiKey?: string;
  timestamp?: number;
  folder?: string;
  signature?: string;
  message?: string;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
};

export default function AdminProductForm({
  categories,
  colors,
  sizes,
  initialData,
}: AdminProductFormProps) {
  const router = useRouter();

  const { alert, showAlert, closeAlert } = useAlert();

  const isEditMode = Boolean(initialData);

  /*
   * --------------------------------
   * SIMPLE PRODUCT CHECK
   * --------------------------------
   */

  const initialIsSimple =
    initialData?.variants.length === 1 &&
    !initialData.variants[0]?.colorId &&
    !initialData.variants[0]?.sizeId;

  /*
   * --------------------------------
   * PRODUCT STATE
   * --------------------------------
   */

  const [name, setName] = useState(initialData?.name ?? "");

  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");

  /*
   * Local copy is important because
   * newly-created categories can be
   * added without refreshing page.
   */
  const [categoryOptions, setCategoryOptions] =
    useState<CategoryOption[]>(categories);

  const [showNewCategory, setShowNewCategory] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");

  const [isAddingCategory, setIsAddingCategory] = useState(false);

  /*
   * Local Color / Size options.
   *
   * New values created through the admin APIs
   * become available immediately without a refresh.
   */
  const [colorOptions, setColorOptions] = useState<ColorOption[]>(colors);
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>(sizes);

  const [showNewColor, setShowNewColor] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [isAddingColor, setIsAddingColor] = useState(false);

  const [showNewSize, setShowNewSize] = useState(false);
  const [newSizeName, setNewSizeName] = useState("");
  const [newSizeSortOrder, setNewSizeSortOrder] = useState("0");
  const [isAddingSize, setIsAddingSize] = useState(false);

  const [price, setPrice] = useState(
    initialData?.variants[0]?.price?.toString() ?? "",
  );

  const [quantity, setQuantity] = useState(
    initialIsSimple ? initialData!.variants[0].stock.toString() : "",
  );

  const [baseSku, setBaseSku] = useState(initialData?.baseSku ?? "");

  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );

  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  /*
   * --------------------------------
   * IMAGE STATE
   * --------------------------------
   */

  const [existingImages, setExistingImages] = useState<InitialImage[]>(
    () => initialData?.images ?? [],
  );

  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);

  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrlsRef = useRef<Set<string>>(new Set());

  const initialPrimaryImage =
    initialData?.images.find((image) => image.isPrimary) ??
    initialData?.images[0] ??
    null;

  const [primaryImageKey, setPrimaryImageKey] = useState<string | null>(
    initialPrimaryImage ? `existing:${initialPrimaryImage.id}` : null,
  );

  useEffect(() => {
    return () => {
      for (const previewUrl of previewUrlsRef.current) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  /*
   * --------------------------------
   * VARIANT STATE
   * --------------------------------
   */

  const [selectedColorId, setSelectedColorId] = useState("");

  const [selectedSizeId, setSelectedSizeId] = useState("");

  const [variantQuantity, setVariantQuantity] = useState("");

  const [pendingVariantImage, setPendingVariantImage] =
    useState<SelectedVariantImage | null>(null);

  const variantImageInputRef = useRef<HTMLInputElement>(null);

  const [variants, setVariants] = useState<AddedVariant[]>(() => {
    if (!initialData || initialData.variants.length === 0) {
      return [];
    }

    if (initialIsSimple) {
      return [];
    }

    return initialData.variants.map((variant) => ({
      id: crypto.randomUUID(),

      existingVariantId: variant.id,

      sku: variant.sku,

      colorId: variant.colorId,

      colorName: variant.colorName,

      sizeId: variant.sizeId,

      sizeName: variant.sizeName,

      quantity: variant.stock,

      existingImageUrl: variant.imageUrl ?? null,
      existingImagePublicId: variant.imagePublicId ?? null,
      selectedImage: null,
    }));
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * --------------------------------
   * TOTAL VARIANT STOCK
   * --------------------------------
   */

  const totalVariantQuantity = useMemo(() => {
    return variants.reduce((total, variant) => total + variant.quantity, 0);
  }, [variants]);

  /*
   * --------------------------------
   * SKU HELPER
   * --------------------------------
   */

  function skuPart(value: string) {
    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /*
   * --------------------------------
   * LOCAL IMAGE SELECTION + CLOUDINARY
   * --------------------------------
   */

  function openSystemFilePicker() {
    fileInputRef.current?.click();
  }

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const validFiles: File[] = [];

    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        showAlert(`${file.name} is not a supported image.`, {
          variant: "warning",
        });
        continue;
      }

      if (file.size > 5_000_000) {
        showAlert(`${file.name} is larger than 5 MB.`, { variant: "warning" });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    const newItems = validFiles.map((file): SelectedImage => {
      const previewUrl = URL.createObjectURL(file);

      previewUrlsRef.current.add(previewUrl);

      return {
        id: crypto.randomUUID(),
        file,
        previewUrl,
      };
    });

    setSelectedImages((current) => [...current, ...newItems]);

    if (!primaryImageKey) {
      setPrimaryImageKey(`new:${newItems[0].id}`);
    }
  }

  function chooseNextPrimary(
    nextExisting: InitialImage[],
    nextSelected: SelectedImage[],
  ) {
    if (nextExisting[0]) {
      return `existing:${nextExisting[0].id}`;
    }

    if (nextSelected[0]) {
      return `new:${nextSelected[0].id}`;
    }

    return null;
  }

  function removeExistingImage(imageId: string) {
    const nextExisting = existingImages.filter((image) => image.id !== imageId);

    setExistingImages(nextExisting);

    if (primaryImageKey === `existing:${imageId}`) {
      setPrimaryImageKey(chooseNextPrimary(nextExisting, selectedImages));
    }
  }

  function removeSelectedImage(imageId: string) {
    const image = selectedImages.find((item) => item.id === imageId);

    if (image) {
      URL.revokeObjectURL(image.previewUrl);
      previewUrlsRef.current.delete(image.previewUrl);
    }

    const nextSelected = selectedImages.filter((item) => item.id !== imageId);

    setSelectedImages(nextSelected);

    if (primaryImageKey === `new:${imageId}`) {
      setPrimaryImageKey(chooseNextPrimary(existingImages, nextSelected));
    }
  }

  async function cleanupUploadedImages(publicIds: string[]) {
    if (publicIds.length === 0) {
      return;
    }

    try {
      await fetch("/api/admin/cloudinary-signature", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicIds,
        }),
      });
    } catch (error) {
      console.error("Cloudinary cleanup error:", error);
    }
  }

  async function uploadSelectedImages(): Promise<UploadedImage[]> {
    if (selectedImages.length === 0) {
      return [];
    }

    const signatureResponse = await fetch("/api/admin/cloudinary-signature", {
      method: "POST",
    });

    const signatureData =
      (await signatureResponse.json()) as CloudinarySignatureResponse;

    if (
      !signatureResponse.ok ||
      !signatureData.success ||
      !signatureData.cloudName ||
      !signatureData.apiKey ||
      !signatureData.timestamp ||
      !signatureData.folder ||
      !signatureData.signature
    ) {
      throw new Error(
        signatureData.message ?? "Unable to authorize image upload.",
      );
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`;

    const uploaded: UploadedImage[] = [];

    try {
      for (const image of selectedImages) {
        const formData = new FormData();

        formData.append("file", image.file);
        formData.append("api_key", signatureData.apiKey);
        formData.append("timestamp", String(signatureData.timestamp));
        formData.append("folder", signatureData.folder);
        formData.append("signature", signatureData.signature);

        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        });

        const result = (await response.json()) as CloudinaryUploadResponse;

        if (!response.ok || !result.secure_url || !result.public_id) {
          throw new Error(
            result.error?.message ?? `Unable to upload ${image.file.name}.`,
          );
        }

        uploaded.push({
          localId: image.id,
          url: result.secure_url,
          publicId: result.public_id,
        });
      }

      return uploaded;
    } catch (error) {
      await cleanupUploadedImages(uploaded.map((image) => image.publicId));

      throw error;
    }
  }

  /*
   * --------------------------------
   * VARIANT IMAGE SELECTION
   * --------------------------------
   */

  function validateImageFile(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showAlert(`${file.name} is not a supported image.`, {
        variant: "warning",
      });

      return false;
    }

    if (file.size > 5_000_000) {
      showAlert(`${file.name} is larger than 5 MB.`, {
        variant: "warning",
      });

      return false;
    }

    return true;
  }

  function createVariantPreview(file: File): SelectedVariantImage {
    const previewUrl = URL.createObjectURL(file);

    previewUrlsRef.current.add(previewUrl);

    return {
      id: crypto.randomUUID(),
      file,
      previewUrl,
    };
  }

  function handlePendingVariantImageSelection(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    event.target.value = "";

    if (!file || !validateImageFile(file)) {
      return;
    }

    if (pendingVariantImage) {
      URL.revokeObjectURL(pendingVariantImage.previewUrl);
      previewUrlsRef.current.delete(pendingVariantImage.previewUrl);
    }

    setPendingVariantImage(createVariantPreview(file));
  }

  function removePendingVariantImage() {
    if (pendingVariantImage) {
      URL.revokeObjectURL(pendingVariantImage.previewUrl);
      previewUrlsRef.current.delete(pendingVariantImage.previewUrl);
    }

    setPendingVariantImage(null);
  }

  function handleExistingVariantImageSelection(
    variantId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    event.target.value = "";

    if (!file || !validateImageFile(file)) {
      return;
    }

    const nextImage = createVariantPreview(file);

    setVariants((current) =>
      current.map((variant) => {
        if (variant.id !== variantId) {
          return variant;
        }

        if (variant.selectedImage) {
          URL.revokeObjectURL(variant.selectedImage.previewUrl);
          previewUrlsRef.current.delete(variant.selectedImage.previewUrl);
        }

        return {
          ...variant,
          selectedImage: nextImage,
        };
      }),
    );
  }

  function removeVariantImage(variantId: string) {
    setVariants((current) =>
      current.map((variant) => {
        if (variant.id !== variantId) {
          return variant;
        }

        if (variant.selectedImage) {
          URL.revokeObjectURL(variant.selectedImage.previewUrl);
          previewUrlsRef.current.delete(variant.selectedImage.previewUrl);
        }

        return {
          ...variant,
          selectedImage: null,
          existingImageUrl: null,
          existingImagePublicId: null,
        };
      }),
    );
  }

  async function uploadVariantImages() {
    const variantsWithNewImages = variants.filter(
      (variant) => variant.selectedImage,
    );

    if (variantsWithNewImages.length === 0) {
      return new Map<string, UploadedImage>();
    }

    const signatureResponse = await fetch("/api/admin/cloudinary-signature", {
      method: "POST",
    });

    const signatureData =
      (await signatureResponse.json()) as CloudinarySignatureResponse;

    if (
      !signatureResponse.ok ||
      !signatureData.success ||
      !signatureData.cloudName ||
      !signatureData.apiKey ||
      !signatureData.timestamp ||
      !signatureData.folder ||
      !signatureData.signature
    ) {
      throw new Error(
        signatureData.message ?? "Unable to authorize variant image upload.",
      );
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`;

    const uploadedByVariant = new Map<string, UploadedImage>();
    const uploadedPublicIds: string[] = [];

    try {
      for (const variant of variantsWithNewImages) {
        const selectedImage = variant.selectedImage!;

        const formData = new FormData();

        formData.append("file", selectedImage.file);
        formData.append("api_key", signatureData.apiKey);
        formData.append("timestamp", String(signatureData.timestamp));
        formData.append("folder", signatureData.folder);
        formData.append("signature", signatureData.signature);

        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        });

        const result = (await response.json()) as CloudinaryUploadResponse;

        if (!response.ok || !result.secure_url || !result.public_id) {
          throw new Error(
            result.error?.message ??
              `Unable to upload ${selectedImage.file.name}.`,
          );
        }

        const uploadedImage: UploadedImage = {
          localId: selectedImage.id,
          url: result.secure_url,
          publicId: result.public_id,
        };

        uploadedByVariant.set(variant.id, uploadedImage);
        uploadedPublicIds.push(result.public_id);
      }

      return uploadedByVariant;
    } catch (error) {
      await cleanupUploadedImages(uploadedPublicIds);
      throw error;
    }
  }

  /*
   * --------------------------------
   * ADD COLOR / SIZE
   * --------------------------------
   */

  async function addColor() {
    const colorName = newColorName.trim();
    const hexacode = newColorHex.trim();

    if (!colorName) {
      showAlert("Enter a color name.", {
        variant: "warning",
      });

      return;
    }

    try {
      setIsAddingColor(true);

      const response = await fetch("/api/admin/colors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: colorName,
          hexacode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showAlert(result.message ?? "Unable to add color.", {
          variant: "error",
        });

        return;
      }

      const color = result.data as ColorOption;

      setColorOptions((current) =>
        [...current, color].sort((a, b) => a.name.localeCompare(b.name)),
      );

      setSelectedColorId(color.id);
      setNewColorName("");
      setNewColorHex("#000000");
      setShowNewColor(false);

      showAlert("Color added successfully.", {
        variant: "success",
      });
    } catch (error) {
      console.error("Add color error:", error);

      showAlert("Something went wrong while adding the color.", {
        variant: "error",
      });
    } finally {
      setIsAddingColor(false);
    }
  }

  async function addSize() {
    const sizeName = newSizeName.trim();
    const sortOrder = Number(newSizeSortOrder);

    if (!sizeName) {
      showAlert("Enter a size name.", {
        variant: "warning",
      });

      return;
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      showAlert("Sort order must be a whole number of 0 or greater.", {
        variant: "warning",
      });

      return;
    }

    try {
      setIsAddingSize(true);

      const response = await fetch("/api/admin/sizes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: sizeName,
          sortOrder,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showAlert(result.message ?? "Unable to add size.", {
          variant: "error",
        });

        return;
      }

      const size = result.data as SizeOption;

      setSizeOptions((current) =>
        [...current, size].sort(
          (a, b) =>
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
            a.name.localeCompare(b.name),
        ),
      );

      setSelectedSizeId(size.id);
      setNewSizeName("");
      setNewSizeSortOrder("0");
      setShowNewSize(false);

      showAlert("Size added successfully.", {
        variant: "success",
      });
    } catch (error) {
      console.error("Add size error:", error);

      showAlert("Something went wrong while adding the size.", {
        variant: "error",
      });
    } finally {
      setIsAddingSize(false);
    }
  }

  /*
   * --------------------------------
   * ADD VARIANT
   * --------------------------------
   */

  function addVariant() {
    if (!selectedColorId && !selectedSizeId) {
      showAlert("Select at least a color or size.", {
        variant: "warning",
      });

      return;
    }

    const qty = Number(variantQuantity);

    if (!Number.isInteger(qty) || qty < 0) {
      showAlert("Enter a valid variant quantity.", {
        variant: "warning",
      });

      return;
    }

    const color = colorOptions.find((item) => item.id === selectedColorId);

    const size = sizeOptions.find((item) => item.id === selectedSizeId);

    const alreadyExists = variants.some(
      (variant) =>
        variant.colorId === (color?.id ?? null) &&
        variant.sizeId === (size?.id ?? null),
    );

    if (alreadyExists) {
      showAlert("This color and size combination already exists.", {
        variant: "warning",
      });

      return;
    }

    const skuParts = [skuPart(baseSku || name || "PRODUCT")];

    if (color?.name) {
      skuParts.push(skuPart(color.name));
    }

    if (size?.name) {
      skuParts.push(skuPart(size.name));
    }

    setVariants((current) => [
      ...current,

      {
        id: crypto.randomUUID(),

        sku: skuParts.join("-"),

        colorId: color?.id ?? null,

        colorName: color?.name ?? null,

        sizeId: size?.id ?? null,

        sizeName: size?.name ?? null,

        quantity: qty,

        existingImageUrl: null,
        existingImagePublicId: null,
        selectedImage: pendingVariantImage,
      },
    ]);

    setSelectedColorId("");
    setSelectedSizeId("");
    setVariantQuantity("");
    setPendingVariantImage(null);
  }

  function removeVariant(id: string) {
    const variant = variants.find((item) => item.id === id);

    if (variant?.selectedImage) {
      URL.revokeObjectURL(variant.selectedImage.previewUrl);
      previewUrlsRef.current.delete(variant.selectedImage.previewUrl);
    }

    setVariants((current) => current.filter((variant) => variant.id !== id));
  }

  /*
   * --------------------------------
   * ADD CATEGORY
   * --------------------------------
   */

  async function addCategory() {
    const categoryName = newCategoryName.trim();

    if (!categoryName) {
      showAlert("Enter a category name.", {
        variant: "warning",
      });

      return;
    }

    try {
      setIsAddingCategory(true);

      const response = await fetch("/api/admin/categories", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: categoryName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showAlert(result.message ?? "Unable to add category.", {
          variant: "error",
        });

        return;
      }

      const category = result.data.category as CategoryOption;

      /*
       * Add newly-created category
       * to the dropdown immediately.
       */
      setCategoryOptions((current) => [...current, category]);

      /*
       * Automatically select it.
       */
      setCategoryId(category.id);

      setNewCategoryName("");

      setShowNewCategory(false);

      showAlert("Category added successfully.", {
        variant: "success",
      });
    } catch (error) {
      console.error("Add category error:", error);

      showAlert("Something went wrong while adding the category.", {
        variant: "error",
      });
    } finally {
      setIsAddingCategory(false);
    }
  }

  /*
   * --------------------------------
   * VALIDATION
   * --------------------------------
   */

  function validateForm() {
    if (!name.trim()) {
      showAlert("Product name is required.", {
        variant: "warning",
      });

      return false;
    }

    if (!categoryId) {
      showAlert("Please select a category.", {
        variant: "warning",
      });

      return false;
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      showAlert("Please enter a valid price.", {
        variant: "warning",
      });

      return false;
    }

    if (variants.length === 0) {
      if (!baseSku.trim()) {
        showAlert("SKU is required.", {
          variant: "warning",
        });

        return false;
      }

      const numericQuantity = Number(quantity);

      if (!Number.isInteger(numericQuantity) || numericQuantity < 0) {
        showAlert("Please enter a valid quantity.", {
          variant: "warning",
        });

        return false;
      }
    }

    if (variants.length > 0) {
      for (const variant of variants) {
        if (!variant.sku.trim()) {
          showAlert("Every variant requires an SKU.", {
            variant: "warning",
          });

          return false;
        }
      }
    }

    return true;
  }

  /*
   * --------------------------------
   * SUBMIT
   * --------------------------------
   */

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      let uploadedImages: UploadedImage[] = [];

      if (selectedImages.length > 0) {
        setIsUploading(true);

        uploadedImages = await uploadSelectedImages();

        setIsUploading(false);
      }

      let uploadedVariantImages = new Map<string, UploadedImage>();

      if (variants.some((variant) => variant.selectedImage)) {
        setIsUploading(true);

        uploadedVariantImages = await uploadVariantImages();

        setIsUploading(false);
      }

      const productVariants =
        variants.length === 0
          ? [
              {
                id: initialIsSimple ? initialData?.variants[0]?.id : undefined,
                sku: baseSku.trim().toUpperCase(),
                price: Number(price),
                stock: Number(quantity),
                colorId: null,
                sizeId: null,
                imageUrl: initialIsSimple
                  ? (initialData?.variants[0]?.imageUrl ?? null)
                  : null,
                imagePublicId: initialIsSimple
                  ? (initialData?.variants[0]?.imagePublicId ?? null)
                  : null,
              },
            ]
          : variants.map((variant) => {
              const uploadedImage = uploadedVariantImages.get(variant.id);

              return {
                id: variant.existingVariantId,
                sku: variant.sku.trim().toUpperCase(),
                price: Number(price),
                stock: variant.quantity,
                colorId: variant.colorId,
                sizeId: variant.sizeId,
                imageUrl:
                  uploadedImage?.url ?? variant.existingImageUrl ?? null,
                imagePublicId:
                  uploadedImage?.publicId ??
                  variant.existingImagePublicId ??
                  null,
              };
            });

      const finalImages = [
        ...existingImages.map((image) => ({
          id: image.id,
          source: "existing" as const,
          url: image.url,
          publicId: image.publicId,
          isPrimary: primaryImageKey === `existing:${image.id}`,
        })),
        ...uploadedImages.map((image) => ({
          source: "new" as const,
          url: image.url,
          publicId: image.publicId,
          isPrimary: primaryImageKey === `new:${image.localId}`,
        })),
      ].map((image, position) => ({
        ...image,
        position,
      }));

      const endpoint = isEditMode
        ? `/api/admin/products/${initialData!.id}`
        : "/api/admin/products";

      const response = await fetch(endpoint, {
        method: isEditMode ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: name.trim(),

          description: description.trim(),

          categoryId,

          images: finalImages,

          isActive,

          variants: productVariants,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showAlert(result.message ?? "Unable to save product.", {
          variant: "error",
        });

        return;
      }

      router.push("/admin/products");

      router.refresh();
    } catch (error) {
      console.error("Save product error:", error);

      showAlert("Something went wrong while saving the product.", {
        variant: "error",
      });
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
    }
  }

  /*
   * --------------------------------
   * UI
   * --------------------------------
   */

  return (
    <>
      <form onSubmit={handleSubmit} className="mx-auto max-w-6xl">
        {/* Header */}

        <div className="mb-5">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="flex items-center gap-2 text-left"
          >
            <ArrowLeft size={16} className="text-blue-600" />

            <span className="text-xl font-semibold tracking-tight text-gray-900">
              {isEditMode ? "Edit Product" : "Add a Single Product"}
            </span>
          </button>

          <div className="mt-5 border-b border-gray-200" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Images */}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleImageSelection}
            />

            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4">
              <div className="flex flex-col items-center justify-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                  <ImageUp size={24} className="text-blue-600" />
                </div>

                <p className="text-sm font-medium text-gray-800">
                  Product Images
                </p>

                <p className="mt-1 text-center text-[11px] leading-4 text-gray-400">
                  JPG, PNG or WEBP · Maximum 5 MB each
                  <br />
                  Select one or multiple images
                </p>

                <button
                  type="button"
                  onClick={openSystemFilePicker}
                  disabled={isSubmitting || isUploading}
                  className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ImageUp size={15} />
                  Select Images
                </button>
              </div>

              {existingImages.length > 0 || selectedImages.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {existingImages.map((image) => {
                    const key = `existing:${image.id}`;
                    const isPrimary = primaryImageKey === key;

                    return (
                      <div
                        key={image.id}
                        className={`relative overflow-hidden rounded-lg border bg-gray-50 ${
                          isPrimary
                            ? "border-blue-500 ring-2 ring-blue-100"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="relative aspect-square">
                          <Image
                            src={image.url}
                            alt={name || "Product"}
                            fill
                            sizes="140px"
                            className="object-contain"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeExistingImage(image.id)}
                          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-gray-600 shadow hover:text-red-600"
                          title="Remove image"
                          aria-label="Remove image"
                        >
                          <X size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setPrimaryImageKey(key)}
                          className={`w-full border-t px-2 py-1.5 text-[10px] font-medium transition ${
                            isPrimary
                              ? "border-blue-100 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-500 hover:text-blue-600"
                          }`}
                        >
                          {isPrimary ? "Primary" : "Set Primary"}
                        </button>
                      </div>
                    );
                  })}

                  {selectedImages.map((image) => {
                    const key = `new:${image.id}`;
                    const isPrimary = primaryImageKey === key;

                    return (
                      <div
                        key={image.id}
                        className={`relative overflow-hidden rounded-lg border bg-gray-50 ${
                          isPrimary
                            ? "border-blue-500 ring-2 ring-blue-100"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="relative aspect-square">
                          <Image
                            src={image.previewUrl}
                            alt={image.file.name}
                            fill
                            unoptimized
                            sizes="140px"
                            className="object-contain"
                          />
                        </div>

                        <span className="absolute left-1.5 top-1.5 rounded bg-gray-900/70 px-1.5 py-0.5 text-[9px] font-medium text-white">
                          New
                        </span>

                        <button
                          type="button"
                          onClick={() => removeSelectedImage(image.id)}
                          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-gray-600 shadow hover:text-red-600"
                          title="Remove image"
                          aria-label="Remove image"
                        >
                          <X size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setPrimaryImageKey(key)}
                          className={`w-full border-t px-2 py-1.5 text-[10px] font-medium transition ${
                            isPrimary
                              ? "border-blue-100 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-500 hover:text-blue-600"
                          }`}
                        >
                          {isPrimary ? "Primary" : "Set Primary"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {isUploading ? (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-medium text-blue-700">
                  <Loader2 size={14} className="animate-spin" />
                  Uploading selected images...
                </div>
              ) : null}
            </div>
          </div>

          {/* Form Fields */}

          <div className="min-w-0 space-y-4">
            {/* Product Name */}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Product Name
              </label>

              <textarea
                value={name}
                onChange={(event) => setName(event.target.value)}
                rows={2}
                placeholder="Enter product name"
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Category */}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Category
              </label>

              <select
                value={showNewCategory ? "__new__" : categoryId}
                onChange={(event) => {
                  const value = event.target.value;

                  if (value === "__new__") {
                    setShowNewCategory(true);

                    return;
                  }

                  setShowNewCategory(false);

                  setCategoryId(value);
                }}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select Category</option>

                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}

                    {!category.isActive ? " (Inactive)" : ""}
                  </option>
                ))}

                <option value="__new__">+ Add New Category</option>
              </select>

              {/* Add New Category */}

              {showNewCategory ? (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();

                        void addCategory();
                      }
                    }}
                    placeholder="Enter category name"
                    disabled={isAddingCategory}
                    autoFocus
                    className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                  />

                  <button
                    type="button"
                    onClick={() => void addCategory()}
                    disabled={isAddingCategory || !newCategoryName.trim()}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
                  >
                    {isAddingCategory ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        Add
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategory(false);

                      setNewCategoryName("");
                    }}
                    disabled={isAddingCategory}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>

            {/* Price / Quantity */}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Price
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Rs.
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="0.00"
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Quantity
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={variants.length > 0 ? totalVariantQuantity : quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  readOnly={variants.length > 0}
                  placeholder="0"
                  className={`h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                    variants.length > 0
                      ? "cursor-default bg-gray-50"
                      : "bg-white"
                  }`}
                />

                {variants.length > 0 ? (
                  <p className="mt-1 text-[10px] text-gray-400">
                    Calculated automatically from variant stock.
                  </p>
                ) : null}
              </div>
            </div>

            {/* SKU */}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Base SKU
              </label>

              <input
                value={baseSku}
                onChange={(event) => setBaseSku(event.target.value)}
                placeholder="PRODUCT-001"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-1 text-[10px] text-gray-400">
                Used as the main SKU for simple products and as the base when
                generating variant SKUs.
              </p>
            </div>

            {/* Variants */}

            <div className="rounded-xl border border-gray-200 bg-white">
              {/* Variant Header */}

              <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Product Variants
                  </h3>

                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Add color and/or size combinations with individual stock
                    quantities.
                  </p>
                </div>

                {variants.length > 0 ? (
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-600">
                      {variants.length} variant
                      {variants.length === 1 ? "" : "s"}
                    </span>

                    <span className="text-[11px] text-gray-500">
                      Stock{" "}
                      <strong className="font-semibold text-gray-800">
                        {totalVariantQuantity}
                      </strong>
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Variant Builder */}

              <div className="p-4">
                <div className="grid items-start gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_180px_42px]">
                  {/* Optional Variant Image */}

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">
                      Image{" "}
                      <span className="font-normal text-gray-400">
                        (optional)
                      </span>
                    </label>

                    <input
                      ref={variantImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePendingVariantImageSelection}
                    />

                    {pendingVariantImage ? (
                      <div className="flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-1.5">
                        <button
                          type="button"
                          onClick={() => variantImageInputRef.current?.click()}
                          className="relative h-7 w-7 shrink-0 overflow-hidden rounded border border-gray-200 bg-white"
                          title="Change variant image"
                        >
                          <Image
                            src={pendingVariantImage.previewUrl}
                            alt={pendingVariantImage.file.name}
                            fill
                            unoptimized
                            sizes="28px"
                            className="object-cover"
                          />
                        </button>

                        <span className="min-w-0 flex-1 truncate text-[10px] text-gray-600">
                          {pendingVariantImage.file.name}
                        </span>

                        <button
                          type="button"
                          onClick={removePendingVariantImage}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Remove variant image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => variantImageInputRef.current?.click()}
                        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 bg-gray-50 px-2 text-[10px] font-medium text-gray-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <ImageUp size={13} />
                        Select Image
                      </button>
                    )}
                  </div>

                  {/* Color */}

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">
                      Color
                    </label>

                    <select
                      value={showNewColor ? "__new__" : selectedColorId}
                      onChange={(event) => {
                        const value = event.target.value;

                        if (value === "__new__") {
                          setShowNewColor(true);
                          return;
                        }

                        setShowNewColor(false);
                        setSelectedColorId(value);
                      }}
                      className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[11px] text-gray-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                    >
                      <option value="">Select Color</option>

                      {colorOptions
                        .filter((color) => color.isActive !== false)
                        .map((color) => (
                          <option key={color.id} value={color.id}>
                            {color.name}
                          </option>
                        ))}

                      <option value="__new__">+ Add New Color</option>
                    </select>

                    {showNewColor ? (
                      <div className="mt-1.5 rounded-md border border-blue-100 bg-blue-50/40 p-1.5">
                        <div className="grid grid-cols-[minmax(0,1fr)_42px] gap-1.5">
                          <input
                            type="text"
                            value={newColorName}
                            onChange={(event) =>
                              setNewColorName(event.target.value)
                            }
                            placeholder="Black"
                            disabled={isAddingColor}
                            className="h-8 min-w-0 rounded-md border border-gray-200 bg-white px-2 text-[11px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500"
                          />

                          <input
                            type="color"
                            value={newColorHex}
                            onChange={(event) =>
                              setNewColorHex(event.target.value)
                            }
                            disabled={isAddingColor}
                            className="h-8 w-10 cursor-pointer rounded-md border border-gray-200 bg-white p-1"
                            title="Choose color"
                          />
                        </div>

                        <div className="mt-1.5 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => void addColor()}
                            disabled={isAddingColor || !newColorName.trim()}
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-blue-600 px-2 text-[10px] font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
                          >
                            {isAddingColor ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Plus size={12} />
                            )}
                            Add Color
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowNewColor(false);
                              setNewColorName("");
                              setNewColorHex("#000000");
                            }}
                            disabled={isAddingColor}
                            className="h-7 rounded-md border border-gray-200 bg-white px-2 text-[10px] font-medium text-gray-600 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Size */}

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">
                      Size
                    </label>

                    <select
                      value={showNewSize ? "__new__" : selectedSizeId}
                      onChange={(event) => {
                        const value = event.target.value;

                        if (value === "__new__") {
                          setShowNewSize(true);
                          return;
                        }

                        setShowNewSize(false);
                        setSelectedSizeId(value);
                      }}
                      className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[11px] text-gray-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                    >
                      <option value="">Select Size</option>

                      {sizeOptions
                        .filter((size) => size.isActive !== false)
                        .map((size) => (
                          <option key={size.id} value={size.id}>
                            {size.name}
                          </option>
                        ))}

                      <option value="__new__">+ Add New Size</option>
                    </select>

                    {showNewSize ? (
                      <div className="mt-1.5 rounded-md border border-blue-100 bg-blue-50/40 p-1.5">
                        <div className="grid grid-cols-[minmax(0,1fr)_54px] gap-1.5">
                          <input
                            type="text"
                            value={newSizeName}
                            onChange={(event) =>
                              setNewSizeName(event.target.value)
                            }
                            placeholder="XL / 42"
                            disabled={isAddingSize}
                            className="h-8 min-w-0 rounded-md border border-gray-200 bg-white px-2 text-[11px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500"
                          />

                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={newSizeSortOrder}
                            onChange={(event) =>
                              setNewSizeSortOrder(event.target.value)
                            }
                            placeholder="Order"
                            disabled={isAddingSize}
                            className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-[11px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500"
                          />
                        </div>

                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void addSize()}
                            disabled={isAddingSize || !newSizeName.trim()}
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-blue-600 px-2 text-[10px] font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
                          >
                            {isAddingSize ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Plus size={12} />
                            )}
                            Add Size
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowNewSize(false);
                              setNewSizeName("");
                              setNewSizeSortOrder("0");
                            }}
                            disabled={isAddingSize}
                            className="h-7 rounded-md border border-gray-200 bg-white px-2 text-[10px] font-medium text-gray-600 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Variant Qty */}

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">
                      Quantity
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={variantQuantity}
                      onChange={(event) =>
                        setVariantQuantity(event.target.value)
                      }
                      placeholder="0"
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Add */}

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addVariant}
                      title="Add variant"
                      aria-label="Add variant"
                      className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-700"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Empty Variant State */}

                {variants.length === 0 ? (
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-dashed border-gray-200 bg-gray-50/70 px-3 py-2.5">
                    <div>
                      <p className="text-xs font-medium text-gray-600">
                        No variants added
                      </p>

                      <p className="mt-0.5 text-[10px] text-gray-400">
                        Leave this section empty for a simple product.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                    <div className="min-w-205">
                      <div className="grid grid-cols-[1fr_1fr_1.4fr_110px_90px_42px] bg-gray-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        <div>Color</div>

                        <div>Size</div>

                        <div>SKU</div>

                        <div>Image</div>

                        <div>Stock</div>

                        <div />
                      </div>

                      {variants.map((variant) => (
                        <div
                          key={variant.id}
                          className="grid grid-cols-[1fr_1fr_1.4fr_110px_90px_42px] items-center border-t border-gray-100 px-3 py-2.5"
                        >
                          {/* Color */}

                          <div className="min-w-0 pr-2">
                            {variant.colorName ? (
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const selectedColor = colorOptions.find(
                                    (color) => color.id === variant.colorId,
                                  );

                                  return selectedColor?.hexacode ? (
                                    <span
                                      className="h-3 w-3 shrink-0 rounded-full border border-gray-200"
                                      style={{
                                        backgroundColor: selectedColor.hexacode,
                                      }}
                                    />
                                  ) : null;
                                })()}

                                <span className="truncate text-xs text-gray-700">
                                  {variant.colorName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </div>

                          {/* Size */}

                          <div className="pr-2">
                            {variant.sizeName ? (
                              <span className="inline-flex min-w-7 items-center justify-center rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700">
                                {variant.sizeName}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </div>

                          {/* SKU */}

                          <div className="pr-2">
                            <input
                              value={variant.sku}
                              onChange={(event) =>
                                setVariants((current) =>
                                  current.map((item) =>
                                    item.id === variant.id
                                      ? {
                                          ...item,

                                          sku: event.target.value,
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none transition focus:border-blue-500"
                            />
                          </div>

                          {/* Optional Variant Image */}

                          <div className="pr-2">
                            <input
                              id={`variant-image-${variant.id}`}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(event) =>
                                handleExistingVariantImageSelection(
                                  variant.id,
                                  event,
                                )
                              }
                            />

                            {variant.selectedImage ||
                            variant.existingImageUrl ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    document
                                      .getElementById(
                                        `variant-image-${variant.id}`,
                                      )
                                      ?.click()
                                  }
                                  className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50"
                                  title="Change variant image"
                                >
                                  <Image
                                    src={
                                      variant.selectedImage?.previewUrl ??
                                      variant.existingImageUrl!
                                    }
                                    alt={variant.sku || "Variant"}
                                    fill
                                    unoptimized={Boolean(variant.selectedImage)}
                                    sizes="32px"
                                    className="object-cover"
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => removeVariantImage(variant.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                                  title="Remove variant image"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  document
                                    .getElementById(
                                      `variant-image-${variant.id}`,
                                    )
                                    ?.click()
                                }
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-gray-300 px-2 text-[10px] font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600"
                              >
                                <ImageUp size={12} />
                                Add
                              </button>
                            )}
                          </div>

                          {/* Quantity */}

                          <div className="pr-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={variant.quantity}
                              onChange={(event) =>
                                setVariants((current) =>
                                  current.map((item) =>
                                    item.id === variant.id
                                      ? {
                                          ...item,

                                          quantity: Number(event.target.value),
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none transition focus:border-blue-500"
                            />
                          </div>

                          {/* Delete */}

                          <button
                            type="button"
                            onClick={() => removeVariant(variant.id)}
                            title="Remove variant"
                            aria-label="Remove variant"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Write product description..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Product Status */}

            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-xs font-medium text-gray-800">
                  Product Status
                </p>

                <p className="mt-0.5 text-[10px] text-gray-400">
                  Active products can be shown to customers.
                </p>
              </div>

              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="peer sr-only"
                />

                <span className="h-5 w-9 rounded-full bg-gray-200 transition peer-checked:bg-blue-600" />

                <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
              </label>
            </div>

            {/* Save */}

            <div className="flex justify-end border-t border-gray-100 pt-4">
              <div className="w-full sm:w-44">
                <Button
                  type="submit"
                  fullWidth
                  disabled={
                    isSubmitting ||
                    isUploading ||
                    isAddingCategory ||
                    isAddingColor ||
                    isAddingSize
                  }
                >
                  {isSubmitting
                    ? isEditMode
                      ? "Updating..."
                      : "Saving..."
                    : isEditMode
                      ? "Update Product"
                      : "Save Product"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {alert ? (
        <Alert
          message={alert.message}
          variant={alert.variant}
          onClose={closeAlert}
        />
      ) : null}
    </>
  );
}
