import {
  PDFDocument,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  appendBezierCurve,
  closePath,
  clip,
  endPath,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import JSZip from "jszip";
import { pagePhotos, photoAssets, type Project } from "../model";
import { buildScene, type Scene, type Clip } from "./layout";
import { advance, fontKey, getFont, mmPerPt } from "./fonts";
import { validatePhotos } from "./images";
import {
  renderCanvas,
  rasterPhoto,
  roundPath,
  cakeRects,
  flowerCircles,
} from "./render";
import { rasterDimensions, withDpi } from "./metadata";
const pt = 72 / 25.4;
const color = (hex: string) =>
  rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  );
export type ExportPages = "cover" | "one" | "all" | "cover-all";
export function exportScenes(
  p: Project,
  pages: ExportPages | boolean,
): Scene[] {
  if (typeof pages === "boolean")
    pages = p.mode === "annual" ? "cover" : pages ? "all" : "one";
  const scenes: Scene[] = [];
  if (pages === "cover" || pages === "cover-all")
    scenes.push(buildScene({ ...p, mode: "annual" }));
  if (pages === "one") scenes.push(buildScene({ ...p, mode: "monthly" }));
  if (pages === "all" || pages === "cover-all")
    for (let month = 1; month <= 12; month++)
      scenes.push(buildScene({ ...p, mode: "monthly" }, month));
  return scenes;
}
export function isExportBlocker(issue: Scene["issues"][number]) {
  return issue.code === "memory" || issue.code === "image-memory";
}
export function validateExport(
  p: Project,
  pages: ExportPages | boolean,
  format: "pdf" | "png" | "jpg" = "png",
) {
  const scenes = exportScenes(p, pages);
  const issues = scenes.flatMap((s) => s.issues);
  const { width, height } = rasterDimensions(p.page.width, p.page.height);
  if (
    format !== "pdf" &&
    (width * height > 40_000_000 || width > 16384 || height > 16384)
  )
    issues.push({
      severity: "error",
      code: "memory",
      message:
        "A lap 300 DPI felbontáson túllépi a biztonságos képméretet. Válassz vektoros PDF-et vagy kisebb papírt; a felbontást nem csökkentjük.",
    });
  const exportPhotos = new Map(
    scenes.flatMap((scene) =>
      pagePhotos(p, scene.page)
        .filter((photo) => photo.visible && photo.data)
        .map((photo) => [photo.id, photo] as const),
    ),
  );
  for (const photo of exportPhotos.values()) {
    const pixels = rasterDimensions(photo.box.w, photo.box.h);
    if (format === "pdf" && pixels.width * pixels.height > 40_000_000)
      issues.push({
        severity: "error",
        code: "image-memory",
        message: `${photo.name}: a fénykép 300 DPI-s feldolgozása meghaladja a biztonságos képméretet. Csökkentsd a kép keretét.`,
      });
  }
  const decoded = photoAssets(p.photos).reduce(
    (bytes, photo) => bytes + photo.pixelWidth * photo.pixelHeight * 4,
    0,
  );
  if (decoded > 256_000_000)
    issues.push({
      severity: "warning",
      code: "decoded-memory",
      message: `A képek becsült kibontott memóriaigénye ${Math.round(decoded / 1_000_000)} MB. Nagy projektnél egyenként exportáld a hónapokat.`,
    });
  return {
    scenes,
    issues: [...new Map(issues.map((i) => [i.message, i])).values()],
  };
}
export function download(
  data: Blob | Uint8Array | string,
  filename: string,
  mime = "application/json",
) {
  const blob =
    data instanceof Blob
      ? data
      : new Blob([typeof data === "string" ? data : new Uint8Array(data)], {
          type: mime,
        });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const yieldUI = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function clipPdf(page: PDFPage, c: Clip, H: number) {
  const x = c.x * pt,
    y = H - c.y * pt,
    w = c.w * pt,
    h = c.h * pt,
    r = Math.min(c.r, c.w / 2, c.h / 2) * pt,
    k = 0.5522847498;
  page.pushOperators(
    moveTo(x + r, y),
    lineTo(x + w - r, y),
    appendBezierCurve(x + w - r + k * r, y, x + w, y - r + k * r, x + w, y - r),
    lineTo(x + w, y - h + r),
    appendBezierCurve(
      x + w,
      y - h + r - k * r,
      x + w - r + k * r,
      y - h,
      x + w - r,
      y - h,
    ),
    lineTo(x + r, y - h),
    appendBezierCurve(x + r - k * r, y - h, x, y - h + r - k * r, x, y - h + r),
    lineTo(x, y - r),
    appendBezierCurve(x, y - r + k * r, x + r - k * r, y, x + r, y),
    closePath(),
    clip(),
    endPath(),
  );
}
export async function createPdf(
  p: Project,
  scenes: Scene[],
  onProgress: (v: string) => void = () => {},
): Promise<Uint8Array> {
  await validatePhotos(p.photos);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(p.title);
  doc.setCreator("Naptárstúdió");
  doc.setLanguage("hu-HU");
  const fonts = new Map<string, PDFFont>();
  for (const scene of scenes) {
    onProgress(`PDF: ${scenes.indexOf(scene) + 1}/${scenes.length}. oldal`);
    const H = scene.height * pt;
    const page = doc.addPage([scene.width * pt, H]);
    for (const n of scene.nodes) {
      page.pushOperators(pushGraphicsState());
      if (n.clip) clipPdf(page, n.clip, H);
      if (n.kind === "rect") {
        const fill = n.fill === "none" ? undefined : color(n.fill),
          stroke = n.stroke === "none" || !n.line ? undefined : color(n.stroke);
        page.drawSvgPath(roundPath({ ...n, r: n.radius }), {
          x: 0,
          y: H,
          scale: pt,
          color: fill,
          borderColor: stroke,
          borderWidth: n.line,
          opacity: n.fill === "none" ? 0 : n.opacity,
          borderOpacity: n.opacity,
        });
      }
      if (n.kind === "text") {
        const key = fontKey(n.type);
        let f = fonts.get(key);
        if (!f) {
          f = await doc.embedFont(getFont(n.type).data, { subset: false });
          fonts.set(key, f);
        }
        let x = n.x;
        for (const c of n.text) {
          page.drawText(c, {
            x: x * pt,
            y: H - n.y * pt,
            size: n.type.size,
            font: f,
            color: color(n.type.color),
            opacity: n.opacity,
          });
          x += advance(c, n.type) + n.type.spacing;
        }
      }
      if (n.kind === "image") {
        const photo = pagePhotos(p, scene.page).find((i) => i.id === n.photoId);
        if (photo) {
          const canvas = rasterPhoto(photo);
          const data = await canvasBlob(canvas, "png");
          const img = await doc.embedPng(
            new Uint8Array(await data.arrayBuffer()),
          );
          page.drawImage(img, {
            x: n.x * pt,
            y: H - (n.y + n.h) * pt,
            width: n.w * pt,
            height: n.h * pt,
            opacity: n.opacity,
          });
          if (photo.border > 0) {
            if (photo.shape === "rectangle") {
              page.drawSvgPath(roundPath({ ...photo.box, r: photo.radius }), {
                x: 0,
                y: H,
                scale: pt,
                color: undefined,
                borderColor: color(photo.borderColor),
                borderWidth: photo.border,
                opacity: 0,
                borderOpacity: n.opacity,
              });
            } else {
              const rx =
                photo.shape === "circle"
                  ? Math.min(photo.box.w, photo.box.h) / 2
                  : photo.box.w / 2;
              const ry = photo.shape === "circle" ? rx : photo.box.h / 2;
              page.drawEllipse({
                x: (photo.box.x + photo.box.w / 2) * pt,
                y: H - (photo.box.y + photo.box.h / 2) * pt,
                xScale: rx * pt,
                yScale: ry * pt,
                color: undefined,
                borderColor: color(photo.borderColor),
                borderWidth: photo.border * pt,
                opacity: 0,
                borderOpacity: n.opacity,
              });
            }
          }
          canvas.width = 0;
          canvas.height = 0;
        }
      }
      if (n.kind === "icon") {
        if (n.icon === "cake")
          for (const [x, y, w, h] of cakeRects(n.x, n.y, n.w, n.h))
            page.drawRectangle({
              x: x * pt,
              y: H - (y + h) * pt,
              width: w * pt,
              height: h * pt,
              color: color(n.color),
              opacity: n.opacity,
            });
        else
          for (const [x, y, r] of flowerCircles(n.x, n.y, n.w, n.h))
            page.drawCircle({
              x: x * pt,
              y: H - y * pt,
              size: r * pt,
              color: color(n.color),
              opacity: n.opacity,
            });
      }
      page.pushOperators(popGraphicsState());
    }
    await yieldUI();
  }
  return doc.save();
}
export async function canvasBlob(
  canvas: HTMLCanvasElement,
  format: "png" | "jpg",
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(
              new Error(
                "A böngésző nem tudta elkészíteni a képet. Exportálj kisebb lapot vagy egyetlen hónapot.",
              ),
            ),
      format === "png" ? "image/png" : "image/jpeg",
      0.97,
    ),
  );
}
export async function createRaster(
  p: Project,
  scene: Scene,
  format: "png" | "jpg",
): Promise<Uint8Array> {
  const { width, height } = rasterDimensions(scene.width, scene.height);
  if (width * height > 40_000_000)
    throw new Error("A lap meghaladja a 40 megapixeles korlátot.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { colorSpace: "srgb" });
  if (!ctx) throw new Error("A böngésző nem támogatja a vászonrajzolást.");
  try {
    ctx.scale(width / scene.width, height / scene.height);
    renderCanvas(ctx, scene, p, 1);
    const blob = await canvasBlob(canvas, format);
    return withDpi(new Uint8Array(await blob.arrayBuffer()), format);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
export async function exportCalendar(
  p: Project,
  format: "pdf" | "png" | "jpg",
  pages: ExportPages | boolean,
  onProgress: (v: string) => void,
  ignoreWarnings = false,
): Promise<void> {
  await document.fonts.ready;
  await validatePhotos(p.photos);
  const { scenes, issues } = validateExport(p, pages, format);
  const errors = issues.filter(
    (i) => isExportBlocker(i) || (!ignoreWarnings && i.severity === "error"),
  );
  if (errors.length) throw new Error(errors.map((i) => i.message).join("\n"));
  const base = `naptar-${p.year}`;
  if (format === "pdf") {
    const data = await createPdf(p, scenes, onProgress);
    download(data, base + ".pdf", "application/pdf");
    return;
  }
  if (scenes.length === 1) {
    onProgress("Képexport • 300 DPI");
    download(
      await createRaster(p, scenes[0], format),
      `${base}-${scenes[0].page === 0 ? "borito" : String(scenes[0].month).padStart(2, "0")}.${format}`,
      format === "png" ? "image/png" : "image/jpeg",
    );
    return;
  }
  const zip = new JSZip();
  for (const [i, s] of scenes.entries()) {
    onProgress(`Képexport: ${i + 1}/${scenes.length}. oldal • 300 DPI`);
    zip.file(
      `${base}-${s.page === 0 ? "borito" : String(s.month).padStart(2, "0")}.${format}`,
      await createRaster(p, s, format),
    );
    await yieldUI();
  }
  onProgress("ZIP összeállítása…");
  download(
    await zip.generateAsync({ type: "blob", compression: "STORE" }),
    base + ".zip",
  );
}
