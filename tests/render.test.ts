import { beforeAll, describe, expect, it, each } from "./assert";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { PDFDocument } from "pdf-lib";
import { defaultProject, applyPaper, type Project } from "../src/model";
import { registerFont } from "../src/engines/fonts";
import manifest from "../src/data/fonts.json";
import { buildScene } from "../src/engines/layout";
import { renderCanvas } from "../src/engines/render";
import { rasterDimensions, withDpi } from "../src/engines/metadata";
import { createPdf, exportScenes, validateExport } from "../src/engines/export";
beforeAll(() => {
  for (const f of manifest) {
    const path = new URL("../public/fonts/" + f.file, import.meta.url);
    registerFont(`${f.family}-${f.weight}`, readFileSync(path));
  }
  mkdirSync("test-results", { recursive: true });
  execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/render-raster.ts"],
    { timeout: 60000 },
  );
});
function raster(p: Project, format: "png" | "jpg") {
  return new Uint8Array(
    readFileSync(`test-results/native-${p.page.size}.${format}`),
  );
}
describe("Shared document layout", () => {
  it("lays annual months in three columns and four rows without personal content", () => {
    const p = applyPaper(
      { ...defaultProject(), mode: "annual" },
      "A4",
      "landscape",
    );
    const scene = buildScene(p);
    const monthNodes = scene.nodes.filter(
      (n) =>
        n.kind === "text" &&
        ["Január", "Február", "Március", "December"].includes(n.text),
    );
    expect(monthNodes).toHaveLength(4);
    expect(monthNodes[0].y).toBe(monthNodes[1].y);
    expect(monthNodes[1].y).toBe(monthNodes[2].y);
    expect(monthNodes[2].x).toBeGreaterThan(monthNodes[1].x);
    expect(monthNodes[3].y).toBeGreaterThan(monthNodes[0].y);
    expect(scene.cells).toHaveLength(365);
    expect(scene.nodes.filter((n) => n.kind === "icon")).toHaveLength(0);
    expect(scene.issues.filter((i) => i.severity === "error")).toEqual([]);
  });
  it("keeps the monthly date-grid height constant for four, five and six rows", () => {
    for (const [year, month] of [
      [2021, 2],
      [2027, 3],
      [2026, 8],
    ]) {
      const p = { ...defaultProject(), year, month };
      const scene = buildScene(p);
      const top = Math.min(...scene.cells.map((c) => c.y)),
        bottom = Math.max(...scene.cells.map((c) => c.y + c.h));
      expect(bottom - top).toBeCloseTo(p.grid.h - p.style.headerHeight);
      expect(scene.issues.filter((i) => i.severity === "error")).toEqual([]);
    }
  });
  it("reports event overflow rather than silently exporting lost information", () => {
    const p = defaultProject();
    p.events = Array.from({ length: 18 }, (_, i) => ({
      id: `event-${i}`,
      kind: "birthday" as const,
      name: "Nagyon hosszú Ágnes név",
      month: 3,
      day: 1,
      birthYear: null,
      showAge: false,
      hidden: false,
    }));
    expect(
      buildScene(p).issues.some(
        (i) => i.code === "overflow" && i.severity === "error",
      ),
    ).toBe(true);
    p.events = p.events.map((e) => ({ ...e, hidden: true }));
    expect(buildScene(p).issues.some((i) => i.code === "overflow")).toBe(false);
    expect(buildScene(p).issues.some((i) => i.code === "hidden-event")).toBe(
      true,
    );
  });
  it("reports missing glyphs, out-of-page geometry and tiny print", () => {
    const p = defaultProject();
    p.style.watermark = "🧑";
    p.grid.x = -10;
    expect(buildScene(p).issues.some((i) => i.code === "glyph")).toBe(true);
    expect(buildScene(p).issues.some((i) => i.code === "outside")).toBe(true);
    const tiny = applyPaper(
      { ...defaultProject(), mode: "annual" },
      "A7",
      "portrait",
    );
    expect(buildScene(tiny).issues.some((i) => i.code === "small-print")).toBe(
      true,
    );
    expect(buildScene(tiny).cells).toHaveLength(365);
  });
  it("does not put editing handles, guide lines or zoom into the scene model", () => {
    const p = defaultProject();
    const a = JSON.stringify(buildScene(p));
    expect(a).not.toContain("zoom");
    expect(a).not.toContain("guide");
    expect(JSON.stringify(buildScene(p))).toBe(a);
  });
});
describe("Print output", () => {
  it("preflights all twelve A6 months without overflow at adaptive defaults", () => {
    const p = applyPaper(defaultProject(), "A6", "portrait");
    expect(
      validateExport(p, true).issues.filter((i) => i.severity === "error"),
    ).toEqual([]);
  });
  it("exports an A4 JPG with exact pixels and 300 DPI JFIF density", () => {
    const data = raster(defaultProject(), "jpg");
    expect(Array.from(data.slice(0, 2))).toEqual([255, 216]);
    const i = Array.from(data).findIndex(
      (v, k) => v === 255 && data[k + 1] === 224,
    );
    expect(data[i + 11]).toBe(1);
    expect((data[i + 12] << 8) | data[i + 13]).toBe(300);
    expect((data[i + 14] << 8) | data[i + 15]).toBe(300);
    expect(rasterDimensions(210, 297)).toEqual({ width: 2480, height: 3508 });
    writeFileSync("test-results/a4-march-2027.jpg", data);
  });
  it("exports an A5 PNG with exact pixels and pHYs 300 DPI metadata", () => {
    const p = applyPaper(defaultProject(), "A5", "portrait");
    const data = raster(p, "png");
    const view = new DataView(data.buffer, data.byteOffset, data.length);
    expect(view.getUint32(16)).toBe(1748);
    expect(view.getUint32(20)).toBe(2480);
    const idx = Buffer.from(data).indexOf("pHYs");
    expect(view.getUint32(idx + 4)).toBe(11811);
    expect(view.getUint32(idx + 8)).toBe(11811);
    expect(data[idx + 12]).toBe(1);
    writeFileSync("test-results/a5-march-2027.png", data);
  });
  it("writes an A6 PDF at exact physical dimensions with embedded vector text", async () => {
    const p = applyPaper(defaultProject(), "A6", "portrait");
    const data = await createPdf(p, exportScenes(p, false));
    const doc = await PDFDocument.load(data);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBeCloseTo((105 / 25.4) * 72, 8);
    expect(doc.getPage(0).getHeight()).toBeCloseTo((148 / 25.4) * 72, 8);
    const raw = Buffer.from(data).toString("latin1");
    expect(raw).not.toContain("/Subtype /Image");
    writeFileSync("test-results/a6-march-2027.pdf", data);
  });
  it("exports a full year as 12 PDF pages", async () => {
    const p = applyPaper(defaultProject(), "A6", "portrait");
    const data = await createPdf(p, exportScenes(p, true));
    expect((await PDFDocument.load(data)).getPageCount()).toBe(12);
    writeFileSync("test-results/year-2027.pdf", data);
  }, 30000);
  it("renders repeatably for later export-regression comparison", () => {
    const p = defaultProject();
    const a = raster(p, "png"),
      b = new Uint8Array(readFileSync("test-results/native-A4-repeat.png"));
    expect(Buffer.compare(a, b)).toBe(0);
    writeFileSync("test-results/a4-march-2027.png", a);
  });
});
