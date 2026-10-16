"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, PackagePlus, UploadCloud } from "lucide-react";

import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";

type Props = { open: boolean; onClose: () => void };
type CsvSignature = {
  success: boolean;
  message?: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId: string;
  resourceType: "raw";
  signature: string;
};

const MAX_CSV_BYTES = 50 * 1024 * 1024;

export default function BulkImportModal({ open, onClose }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"signing" | "uploading" | "starting" | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError(null);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setError("Select a .csv file.");
      return;
    }
    if (selected.size <= 0 || selected.size > MAX_CSV_BYTES) {
      setFile(null);
      setError("The CSV must be between 1 byte and 50 MB.");
      return;
    }
    setFile(selected);
  }

  async function startImport() {
    if (!file || busy) return;
    setError(null);
    setBusy(true);
    try {
      setPhase("signing");
      const signatureResponse = await fetch("/api/admin/upload/csv-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, sizeBytes: file.size }),
      });
      const signed = (await signatureResponse.json()) as CsvSignature;
      if (!signatureResponse.ok || !signed.success) {
        throw new Error(signed.message ?? "Unable to authorize CSV upload.");
      }

      setPhase("uploading");
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", signed.apiKey);
      form.append("timestamp", String(signed.timestamp));
      form.append("folder", signed.folder);
      form.append("public_id", signed.publicId);
      form.append("signature", signed.signature);
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signed.cloudName}/raw/upload`,
        { method: "POST", body: form },
      );
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok || !uploaded.secure_url || !uploaded.public_id) {
        throw new Error(uploaded.error?.message ?? "Cloudinary could not upload the CSV.");
      }

      setPhase("starting");
      const initiateResponse = await fetch("/api/admin/upload/csv-initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secureUrl: uploaded.secure_url,
          publicId: uploaded.public_id,
          version: uploaded.version,
          filename: file.name,
          sizeBytes: file.size,
        }),
      });
      const initiated = await initiateResponse.json();
      if (!initiateResponse.ok || !initiated.success) {
        throw new Error(initiated.message ?? "Unable to start the import job.");
      }

      const eventId = initiated.data.eventId as string;
      setFile(null);
      onClose();
      router.push(`/admin/products/import/${eventId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start CSV import.");
    } finally {
      setBusy(false);
      setPhase(null);
    }
  }

  const phaseLabel = phase === "signing" ? "Authorizing upload…" : phase === "uploading" ? "Uploading CSV to Cloudinary…" : phase === "starting" ? "Queueing import job…" : "Start CSV import";

  return (
    <>
      <Modal
        open={open}
        onClose={() => {
          if (!busy) {
            setFile(null);
            setError(null);
            onClose();
          }
        }}
        title="Import products from CSV"
        description="Upload one CSV. The background jobs service will parse it and match image filenames on its configured image directory."
        icon={<PackagePlus className="h-5 w-5" />}
        className="max-w-xl"
      >
        <div className="space-y-4">
          <a
            href="/templates/product-import-template.csv"
            download
            className="inline-flex items-center gap-2 rounded-lg bg-blue-50 py-2 pl-2 pr-3 text-xs font-semibold text-[#087ff5] transition hover:bg-blue-100"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#087ff5] shadow-sm"><Download size={13} /></span>
            Download CSV template
          </a>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[#087ff5]"><FileSpreadsheet size={14} /></span>
              <p className="text-xs font-semibold text-gray-800">Product CSV</p>
            </div>
            <label className="mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-2 text-xs font-medium text-gray-700 transition hover:border-[#087ff5] hover:bg-blue-50 hover:text-[#087ff5]">
              <UploadCloud size={14} />
              {file ? "Change CSV file" : "Select CSV file"}
              <input type="file" accept=".csv,text/csv" className="hidden" disabled={busy} onChange={handleFileChange} />
            </label>
            {file ? (
              <p className="mt-2 flex items-center gap-1 truncate text-[10px] font-medium text-green-700" title={file.name}>
                <CheckCircle2 size={11} className="shrink-0" /><span className="truncate">{file.name}</span>
                <span className="shrink-0 text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </p>
            ) : (
              <p className="mt-2 text-[10px] leading-tight text-gray-400">productName, category, color, size, sku, price, stock; description and image filename are optional.</p>
            )}
          </div>

          {error ? <Alert message={error} variant="error" /> : null}
        </div>

        <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
          <Button type="button" onClick={startImport} disabled={!file || busy}>
            {busy ? <><Loader2 size={14} className="mr-1.5 animate-spin" />{phaseLabel}</> : phaseLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
