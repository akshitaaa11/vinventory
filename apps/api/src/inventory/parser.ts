import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import { fromBuffer } from "yauzl";
import {
  maxImportBytes, maxImportRows,
  type InventoryImportFile, type ImportPreview,
} from "@vinventory/contracts";

export class ImportError extends Error {
  constructor(message: string, readonly statusCode = 400) { super(message); }
}

// Validate actual expanded ZIP bytes before ExcelJS loads the workbook.
// No archive contents are written to disk.
async function validateArchive(buffer: Buffer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) { reject(new ImportError("Invalid Excel file.")); return; }
      let total = 0;
      let count = 0;
      const fail = () => { zip.close(); reject(new ImportError("Excel file is invalid or too large when expanded.")); };
      zip.on("error", fail);
      zip.on("end", resolve);
      zip.on("entry", (entry) => {
        count++;
        if (count > 200 || entry.uncompressedSize > 20 * 1024 * 1024 ||
            total + entry.uncompressedSize > 20 * 1024 * 1024 || entry.isEncrypted()) {
          fail(); return;
        }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) { fail(); return; }
          stream.on("error", fail);
          stream.on("data", (chunk: Buffer) => {
            total += chunk.length;
            if (total > 20 * 1024 * 1024) { stream.destroy(); fail(); }
          });
          stream.on("end", () => zip.readEntry());
        });
      });
      zip.readEntry();
    });
  });
}

const headers = ["Stock code", "Item/model name", "Tracking", "Quantity", "Asset tags"];
export const importTemplate = `${headers.join(",")}\r\n`;
const normalize = (value: string) => value.trim().toLowerCase().replace(/[ _-]+/g, " ");

export async function parseInventoryFile(file: InventoryImportFile): Promise<ImportPreview> {
  const buffer = Buffer.from(file.content, "base64");
  if (buffer.length > maxImportBytes) throw new ImportError("Files must be 2 MB or smaller.");
  let table: { row: number; cells: unknown[] }[] = [];
  if (/\.csv$/i.test(file.filename)) {
    try {
      const records = parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer), {
        bom: true, skip_empty_lines: true, relax_column_count: true,
        record_delimiter: ["\r\n", "\n", "\r"],
        max_record_size: 16000, info: true,
        on_record: (record, context) => {
          if (context.records > maxImportRows + 1) throw new Error("Too many rows");
          return record;
        },
      }) as unknown as { record: string[]; info: { lines: number } }[];
      table = records.map(({ record, info }) => ({ row: info.lines, cells: record }));
    } catch {
      throw new ImportError("Cannot read CSV. Use UTF-8, comma-separated columns, valid quotes, and at most 500 rows.");
    }
  } else if (/\.xlsx$/i.test(file.filename)) {
    await validateArchive(buffer);
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]); }
    catch { throw new ImportError("Cannot read Excel file. Use an unprotected .xlsx workbook."); }
    const sheets = workbook.worksheets.filter((sheet) => sheet.actualRowCount > 0);
    if (sheets.length !== 1) throw new ImportError("Use one populated worksheet per import.");
    const sheet = sheets[0]!;
    if (sheet.rowCount > maxImportRows + 1 || sheet.columnCount > 20) {
      throw new ImportError("Excel files may contain at most 500 data rows and 20 columns.");
    }
    sheet.eachRow((row, number) => {
      const cells: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell, column) => {
        // Reject formulas, errors, hyperlinks and dates, even with cached values.
        cells[column - 1] = cell.value ?? "";
      });
      table.push({ row: number, cells });
    });
  } else throw new ImportError("Choose a .csv or .xlsx file. Save older .xls files as .xlsx first.");

  table = table.filter(({ cells }) => cells.some((cell) => cell !== "" && cell !== null));
  const first = table.shift();
  if (!first || !table.length) throw new ImportError("Add at least one item below the header row.");
  if (table.length > maxImportRows) throw new ImportError("Import at most 500 items at a time.");
  const names = first.cells.map((cell) => typeof cell === "string" ? normalize(cell) : "");
  const columns = headers.map((header) => names.indexOf(normalize(header)));
  if (columns.slice(0, 4).some((column) => column < 0)) {
    throw new ImportError("Required columns: Stock code, Item/model name, Tracking, Quantity. Asset tags is optional for quantity tracking.");
  }
  if (new Set(names).size !== names.length || names.some((name) => !headers.some((header) => normalize(header) === name))) {
    throw new ImportError("Use each template column once, with no extra columns.");
  }
  const result: ImportPreview = { rows: [], issues: [] };
  const codes = new Set<string>();
  const tags = new Set<string>();
  let unitCount = 0;
  for (const { row, cells } of table) {
    const issue = (field: string, message: string) => result.issues.push({ row, field, message });
    if (cells.length > names.length && cells.slice(names.length).some((cell) => cell !== "")) {
      issue("Row", "More values than column headers.");
    }
    const values = columns.map((column, index) => {
      const value = column < 0 ? "" : cells[column] ?? "";
      if (typeof value !== "string" && typeof value !== "number") {
        issue(headers[index]!, "Use plain text or numbers, not formulas, links, dates or errors.");
        return "";
      }
      if ((index === 0 || index === 4) && typeof value === "number") {
        issue(headers[index]!, "Format identifiers as text to preserve leading zeros.");
      }
      return String(value).trim();
    });
    const [stockCode = "", name = "", trackingValue = "", quantityText = "", assetText = ""] = values;
    const tracking = trackingValue.toLowerCase();
    const quantity = Number(quantityText);
    const assetTags = assetText ? assetText.split(";").map((tag) => tag.trim()) : [];
    if (!stockCode || stockCode.length > 80 || /[\x00-\x1f]/.test(stockCode)) issue("Stock code", "Enter a stock code of 1–80 characters without control characters.");
    if (codes.has(stockCode)) issue("Stock code", "Duplicate stock code in this file.");
    codes.add(stockCode);
    if (!name || name.length > 200 || /[\x00-\x1f]/.test(name)) issue("Item/model name", "Enter a name of 1–200 characters without control characters.");
    if (tracking !== "individual" && tracking !== "quantity") issue("Tracking", "Use individual or quantity.");
    if (!/^\d+$/.test(quantityText) || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000) issue("Quantity", "Use a whole number from 0 to 1,000,000.");
    if (tracking === "quantity" && assetTags.length) issue("Asset tags", "Leave blank for quantity-tracked items.");
    if (tracking === "individual") {
      unitCount += assetTags.length;
      if (quantity !== assetTags.length) issue("Asset tags", "Provide one semicolon-separated asset tag per unit; the count must match Quantity.");
    }
    for (const tag of assetTags) {
      if (!tag || tag.length > 100 || /[\x00-\x1f]/.test(tag)) issue("Asset tags", "Each tag must be 1–100 characters without control characters.");
      if (tags.has(tag)) issue("Asset tags", `Duplicate asset tag: ${tag}.`);
      tags.add(tag);
    }
    result.rows.push({ row, stockCode, name, tracking: tracking === "individual" ? "individual" : "quantity", quantity: Number.isFinite(quantity) ? quantity : 0, assetTags });
  }
  if (unitCount > 2000) result.issues.push({ row: 0, field: "Asset tags", message: "Import at most 2,000 individually tracked units at a time." });
  return result;
}
