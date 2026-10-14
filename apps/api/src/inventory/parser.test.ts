import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { importTemplate, parseInventoryFile } from "./parser.js";

const csv = (body: string) => ({ filename: "inventory.csv", content: Buffer.from(body).toString("base64") });
async function xlsx(rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Items").addRows(rows);
  return { filename: "inventory.xlsx", content: Buffer.from(await workbook.xlsx.writeBuffer()).toString("base64") };
}
const headers = ["Stock code", "Item/model name", "Tracking", "Quantity", "Asset tags"];

describe("inventory file validation", () => {
  it("reads UTF-8 BOM, quoted commas/newlines, reordered headers, and preserves identifier zeros", async () => {
    const result = await parseInventoryFile(csv('\ufeffQuantity,Tracking,Stock code,Item/model name\r\n3,quantity,001,"Sensor, exact variant"\r\n'));
    expect(result.issues).toEqual([]);
    expect(result.rows[0]).toMatchObject({ stockCode: "001", name: "Sensor, exact variant", quantity: 3, assetTags: [] });
    const multiline = await parseInventoryFile(csv(`${importTemplate}A,"Line one\nLine two",quantity,1,`));
    expect(multiline.issues[0]?.field).toBe("Item/model name");
  });

  it("reads real Excel files with individual asset tags", async () => {
    const result = await parseInventoryFile(await xlsx([headers, ["001", "FPGA board", "individual", 2, "M201-001-01;M201-001-02"]]));
    expect(result.issues).toEqual([]);
    expect(result.rows[0]).toMatchObject({ stockCode: "001", quantity: 2, assetTags: ["M201-001-01", "M201-001-02"] });
  });

  it("rejects formulas even with a plausible cached result, and numeric identifiers", async () => {
    const result = await parseInventoryFile(await xlsx([headers, [1, "Board", "quantity", { formula: "1+1", result: 2 }, ""]]));
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "Stock code", message: expect.stringContaining("as text") }),
      expect.objectContaining({ field: "Quantity", message: expect.stringContaining("not formulas") }),
    ]));
  });

  it("reports invalid quantities, tracking, duplicate stock and tags, and mismatched unit counts", async () => {
    const result = await parseInventoryFile(csv(`${importTemplate}A,Board,individual,2,UNIT-1\nA,Board,individual,1,UNIT-1\nB,Sensor,other,-1,\nC,Tool,quantity,1.5,UNEXPECTED`));
    expect(result.issues.map((issue) => issue.message).join(" ")).toContain("count must match");
    expect(result.issues.map((issue) => issue.message).join(" ")).toContain("Duplicate stock code");
    expect(result.issues.map((issue) => issue.message).join(" ")).toContain("Duplicate asset tag");
    expect(result.issues.map((issue) => issue.field)).toEqual(expect.arrayContaining(["Quantity", "Tracking", "Asset tags"]));
  });

  it("rejects missing, duplicate and unexpected headers, malformed CSV, empty files and oversized imports", async () => {
    for (const body of ["Stock code,Quantity\nA,1", "Stock code,Item/model name,Tracking,Quantity,Quantity\nA,B,quantity,1,1", `${importTemplate.trim()},Other\nA,B,quantity,1,,extra`, `${importTemplate}A,"broken,quantity,1,`, importTemplate, ""]) {
      await expect(parseInventoryFile(csv(body))).rejects.toThrow();
    }
    await expect(parseInventoryFile(csv(importTemplate + Array.from({ length: 501 }, (_, i) => `A${i},Board,quantity,1,`).join("\n")))).rejects.toThrow("500");
    await expect(parseInventoryFile(csv("x".repeat(2 * 1024 * 1024 + 1)))).rejects.toThrow("2 MB");
  });

  it("rejects corrupt Excel and multiple populated sheets", async () => {
    await expect(parseInventoryFile({ ...csv("not a workbook"), filename: "bad.xlsx" })).rejects.toThrow();
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("One").addRows([headers, ["A", "Board", "quantity", 1]]);
    workbook.addWorksheet("Two").addRow(["not imported silently"]);
    await expect(parseInventoryFile({ filename: "two.xlsx", content: Buffer.from(await workbook.xlsx.writeBuffer()).toString("base64") })).rejects.toThrow("one populated");
  });

  it("rejects archives that expand beyond the bound before parsing XML", async () => {
    const file = await xlsx([headers, ["A", "x".repeat(21 * 1024 * 1024), "quantity", 1]]);
    await expect(parseInventoryFile(file)).rejects.toThrow("too large when expanded");
  });
});
