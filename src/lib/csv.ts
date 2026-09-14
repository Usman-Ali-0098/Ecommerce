// Minimal RFC 4180 CSV parser (quoted fields, embedded commas/newlines,
// escaped "" quotes). No external dependency for a handful of columns.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\n") {
      pushRow();
    } else if (char === "\r") {
      // swallow, \n (if present) drives the row break
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export type CsvVariantRow = {
  productName: string;
  description: string;
  category: string;
  color: string;
  size: string;
  sku: string;
  price: string;
  stock: string;
};

const EXPECTED_HEADERS = ["productName", "description", "category", "color", "size", "sku", "price", "stock"];

export function parseProductCsv(text: string): { rows: CsvVariantRow[]; error?: string } {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], error: "The CSV file is empty." };
  }

  const header = table[0].map((h) => h.trim());
  const missing = EXPECTED_HEADERS.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return { rows: [], error: `Missing column(s): ${missing.join(", ")}. Expected: ${EXPECTED_HEADERS.join(", ")}.` };
  }

  const indexOf = (name: string) => header.indexOf(name);
  const rows = table.slice(1).map((cells) => ({
    productName: (cells[indexOf("productName")] ?? "").trim(),
    description: (cells[indexOf("description")] ?? "").trim(),
    category: (cells[indexOf("category")] ?? "").trim(),
    color: (cells[indexOf("color")] ?? "").trim(),
    size: (cells[indexOf("size")] ?? "").trim(),
    sku: (cells[indexOf("sku")] ?? "").trim(),
    price: (cells[indexOf("price")] ?? "").trim(),
    stock: (cells[indexOf("stock")] ?? "").trim(),
  }));

  return { rows };
}
