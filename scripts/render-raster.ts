import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { registerFont } from "../src/engines/fonts";
import manifest from "../src/data/fonts.json";
import { buildScene } from "../src/engines/layout";
import { renderCanvas } from "../src/engines/render";
import { rasterDimensions, withDpi } from "../src/engines/metadata";
import { applyPaper, defaultProject } from "../src/model";
for (const f of manifest) {
  const path = new URL("../public/fonts/" + f.file, import.meta.url);
  registerFont(
    `${f.family}-${f.weight}${"italic" in f && f.italic ? "-italic" : ""}`,
    readFileSync(path),
  );
  GlobalFonts.registerFromPath(path.pathname, f.family);
}
mkdirSync("test-results", { recursive: true });
for (const size of ["A4", "A5", "A6", "A7"] as const) {
  const p = applyPaper(
      { ...defaultProject(), mode: size === "A7" ? "annual" : "monthly" },
      size,
      "portrait",
    ),
    scene = buildScene(p),
    d = rasterDimensions(p.page.width, p.page.height);
  const canvas = createCanvas(d.width, d.height);
  const ctx = canvas.getContext("2d");
  ctx.scale(d.width / scene.width, d.height / scene.height);
  renderCanvas(ctx as unknown as CanvasRenderingContext2D, scene, p, 1);
  writeFileSync(
    `test-results/native-${size}.png`,
    withDpi(canvas.toBuffer("image/png"), "png"),
  );
  writeFileSync(
    `test-results/native-${size}.jpg`,
    withDpi(canvas.toBuffer("image/jpeg"), "jpg"),
  );
  if (size === "A4") {
    ctx.clearRect(0, 0, p.page.width, p.page.height);
    renderCanvas(ctx as unknown as CanvasRenderingContext2D, scene, p, 1);
    writeFileSync(
      "test-results/native-A4-repeat.png",
      withDpi(canvas.toBuffer("image/png"), "png"),
    );
  }
}
// The native graphics backend keeps platform font-worker handles alive on some hosts.
// This isolated test helper exits only after every synchronous render/write completes.
process.exit(0);
