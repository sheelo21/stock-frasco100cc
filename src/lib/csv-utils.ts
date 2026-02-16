import { supabase } from "@/integrations/supabase/client";

const CSV_HEADERS = [
  "商品番号",
  "商品名",
  "カタログページ",
  "親カテゴリ",
  "子カテゴリ",
  "カラー",
  "JANコード",
  "上代(税込)",
  "サイズ",
  "新商品",
  "在庫数",
];

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  product_number: string | null;
  catalog_page: string | null;
  parent_category: string | null;
  sub_category: string | null;
  color: string | null;
  size: string | null;
  price_with_tax: number | null;
  is_new: boolean;
}

export function exportProductsToCSV(products: Product[]): string {
  const lines = [CSV_HEADERS.join(",")];

  for (const p of products) {
    const row = [
      escapeCSV(p.product_number),
      escapeCSV(p.name),
      escapeCSV(p.catalog_page),
      escapeCSV(p.parent_category),
      escapeCSV(p.sub_category),
      escapeCSV(p.color),
      escapeCSV(p.barcode),
      p.price_with_tax != null ? String(p.price_with_tax) : "",
      escapeCSV(p.size),
      p.is_new ? "1" : "0",
      String(p.stock),
    ];
    lines.push(row.join(","));
  }

  return "\uFEFF" + lines.join("\n"); // BOM for Excel
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
}

async function registerMissingOptions(
  newOptions: Record<string, Set<string>>
) {
  // Fetch all existing options
  const { data: existing } = await supabase
    .from("dropdown_options")
    .select("type, value");

  const existingSet = new Set(
    (existing || []).map((o) => `${o.type}::${o.value}`)
  );

  const toInsert: { type: string; value: string; sort_order: number }[] = [];

  // Count existing per type for sort_order
  const maxOrder: Record<string, number> = {};
  for (const o of existing || []) {
    maxOrder[o.type] = Math.max(maxOrder[o.type] ?? -1, 0);
  }

  for (const [type, values] of Object.entries(newOptions)) {
    let order = (maxOrder[type] ?? -1) + 1;
    for (const value of values) {
      if (!existingSet.has(`${type}::${value}`)) {
        toInsert.push({ type, value, sort_order: order++ });
      }
    }
  }

  if (toInsert.length > 0) {
    await supabase.from("dropdown_options").insert(toInsert);
  }
}

export async function importProductsFromCSV(
  csvText: string
): Promise<ImportResult> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { success: 0, errors: [{ row: 0, message: "データがありません" }] };
  }

  // Skip header
  const dataLines = lines.slice(1);
  const result: ImportResult = { success: 0, errors: [] };

  // Collect unique dropdown values from CSV
  const newOptions: Record<string, Set<string>> = {
    parent_category: new Set<string>(),
    sub_category: new Set<string>(),
    color: new Set<string>(),
    size: new Set<string>(),
  };

  for (const line of dataLines) {
    const fields = parseCSVLine(line);
    if (fields[3]?.trim()) newOptions.parent_category.add(fields[3].trim());
    if (fields[4]?.trim()) newOptions.sub_category.add(fields[4].trim());
    if (fields[5]?.trim()) newOptions.color.add(fields[5].trim());
    if (fields[8]?.trim()) newOptions.size.add(fields[8].trim());
  }

  // Register missing dropdown options
  await registerMissingOptions(newOptions);

  const batchSize = 50;
  for (let i = 0; i < dataLines.length; i += batchSize) {
    const batch = dataLines.slice(i, i + batchSize);
    const rows: any[] = [];

    for (let j = 0; j < batch.length; j++) {
      const rowIndex = i + j + 2; // 1-indexed, +1 for header
      const fields = parseCSVLine(batch[j]);

      const name = fields[1]?.trim();
      const barcode = fields[6]?.trim();

      if (!name || !barcode) {
        result.errors.push({
          row: rowIndex,
          message: "商品名またはJANコードが空です",
        });
        continue;
      }

      const priceWithTax = fields[7]?.trim()
        ? parseInt(fields[7].trim()) || null
        : null;
      const size = fields[8]?.trim() || null;
      const productNumber = fields[0]?.trim() || null;
      const modelNumber = productNumber
        ? `${productNumber}${size ? `-${size}` : ""}`
        : null;

      rows.push({
        product_number: productNumber,
        name,
        catalog_page: fields[2]?.trim() || null,
        parent_category: fields[3]?.trim() || null,
        sub_category: fields[4]?.trim() || null,
        color: fields[5]?.trim() || null,
        barcode,
        price_with_tax: priceWithTax,
        price_without_tax: priceWithTax
          ? Math.round(priceWithTax / 1.1)
          : null,
        size,
        model_number: modelNumber,
        is_new: fields[9]?.trim() === "1",
        stock: fields[10]?.trim() ? parseInt(fields[10].trim()) || 0 : 0,
      });
    }

    if (rows.length > 0) {
      const { error, data } = await supabase
        .from("products")
        .upsert(rows, { onConflict: "barcode" })
        .select();

      if (error) {
        for (let j = 0; j < rows.length; j++) {
          result.errors.push({
            row: i + j + 2,
            message: error.message,
          });
        }
      } else {
        result.success += data?.length || rows.length;
      }
    }
  }

  return result;
}
