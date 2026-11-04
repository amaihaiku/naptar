import {
  emptyPhoto,
  photoAssets,
  type Photo,
  type PhotoAsset,
  type Project,
} from "../model";
export const imageCache = new Map<string, HTMLImageElement>();
export function cropGeometry(p: Photo) {
  const radians = ((p.edits?.rotation ?? 0) * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians)),
    cos = Math.abs(Math.cos(radians));
  const requiredW = cos * p.box.w + sin * p.box.h;
  const requiredH = sin * p.box.w + cos * p.box.h;
  const scale =
    Math.max(requiredW / p.pixelWidth, requiredH / p.pixelHeight) * p.zoom;
  const w = p.pixelWidth * scale,
    h = p.pixelHeight * scale;
  return {
    x: p.box.x + (p.box.w - w) / 2 + (p.panX * (w - requiredW)) / 2,
    y: p.box.y + (p.box.h - h) / 2 + (p.panY * (h - requiredH)) / 2,
    w,
    h,
    extraX: w - requiredW,
    extraY: h - requiredH,
  };
}
export async function decodeImage(data: string): Promise<HTMLImageElement> {
  const old = imageCache.get(data);
  if (old) return old;
  const image = new Image();
  image.src = data;
  await image.decode();
  if (image.naturalWidth * image.naturalHeight > 40_000_000)
    throw new Error("A kép legfeljebb 40 megapixeles lehet.");
  imageCache.set(data, image);
  return image;
}
export async function validatePhotos(photos: Photo[]): Promise<void> {
  for (const p of photoAssets(photos)) {
    const img = await decodeImage(p.data);
    if (
      img.naturalWidth !== p.pixelWidth ||
      img.naturalHeight !== p.pixelHeight
    )
      throw new Error("A tárolt képméret nem egyezik a képfájllal: " + p.name);
  }
}
export function pruneImages(photos: Photo[]) {
  const active = new Set(photoAssets(photos).map((p) => p.data));
  for (const key of imageCache.keys())
    if (!active.has(key)) imageCache.delete(key);
}
export async function readPhoto(file: File): Promise<PhotoAsset> {
  if (file.size > 25_000_000) throw new Error("A kép legfeljebb 25 MB lehet.");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const png =
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!(png || jpg || webp))
    throw new Error("Csak valódi JPG, PNG vagy WebP kép tölthető fel.");
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("A kép nem olvasható."));
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(
      new Blob([file], {
        type: png ? "image/png" : jpg ? "image/jpeg" : "image/webp",
      }),
    );
  });
  const image = await decodeImage(data);
  return {
    name: file.name.slice(0, 120),
    data,
    pixelWidth: image.naturalWidth,
    pixelHeight: image.naturalHeight,
  };
}
export function createSlot(p: Project): Photo {
  const page = p.mode === "annual" ? 0 : p.month;
  const w = p.page.width * 0.8;
  const y = page === 0 ? p.page.height * 0.23 : 8;
  const h = p.page.height * 0.26;
  const slotNumber =
    Math.max(0, ...p.photos.map((slot) => slot.slotNumber ?? 0)) + 1;
  return {
    id: crypto.randomUUID(),
    ...emptyPhoto,
    page,
    slotNumber,
    box: { x: p.page.width * 0.1, y, w, h, locked: false },
    role: "photo",
    z: -1,
    zoom: 1,
    panX: 0,
    panY: 0,
    shape: "rectangle",
    radius: 0,
    border: 0,
    borderColor: "#ffffff",
    shadow: 0,
    opacity: 1,
    visible: true,
    aspectLock: false,
  };
}
export function photoPath(
  ctx: CanvasRenderingContext2D,
  p: Photo,
  offsetX = 0,
  offsetY = 0,
) {
  const { x, y, w, h } = p.box;
  ctx.beginPath();
  if (p.shape !== "rectangle")
    ctx.ellipse(
      x - offsetX + w / 2,
      y - offsetY + h / 2,
      p.shape === "circle" ? Math.min(w, h) / 2 : w / 2,
      p.shape === "circle" ? Math.min(w, h) / 2 : h / 2,
      0,
      0,
      Math.PI * 2,
    );
  else
    ctx.roundRect(
      x - offsetX,
      y - offsetY,
      w,
      h,
      Math.min(p.radius, w / 2, h / 2),
    );
}
// The same sRGB matrix is used for the SVG preview and both export paths.
export function photoColorMatrix(edits: Photo["edits"]): number[] | undefined {
  const {
    brightness = 0,
    contrast = 0,
    saturation = 0,
    temperature = 0,
  } = edits ?? {};
  if (!brightness && !contrast && !saturation && !temperature) return;
  const light = 1 + brightness / 100;
  const contrastScale = 1 + contrast / 100;
  const chroma = 1 + saturation / 100;
  const warmth = temperature / 250;
  const channelScales = [1 + warmth, 1, 1 - warmth];
  const luma = [0.2126, 0.7152, 0.0722];
  return [
    ...channelScales.flatMap((gain, row) => [
      ...luma.map(
        (weight, col) =>
          gain *
          light *
          contrastScale *
          ((1 - chroma) * weight + (row === col ? chroma : 0)),
      ),
      0,
      (gain * (1 - contrastScale)) / 2,
    ]),
    0,
    0,
    0,
    1,
    0,
  ];
}
function adjustColors(image: HTMLImageElement, matrix: number[]) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", {
    colorSpace: "srgb",
    willReadFrequently: true,
  });
  if (!ctx) throw new Error("A kép színei nem dolgozhatók fel.");
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rgba = pixels.data;
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i],
      g = rgba[i + 1],
      b = rgba[i + 2];
    rgba[i] = matrix[0] * r + matrix[1] * g + matrix[2] * b + matrix[4] * 255;
    rgba[i + 1] =
      matrix[5] * r + matrix[6] * g + matrix[7] * b + matrix[9] * 255;
    rgba[i + 2] =
      matrix[10] * r + matrix[11] * g + matrix[12] * b + matrix[14] * 255;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}
export function paintPhoto(
  ctx: CanvasRenderingContext2D,
  p: Photo,
  offsetX = 0,
  offsetY = 0,
) {
  const image = imageCache.get(p.data);
  if (!image) throw new Error("A kép még nem áll készen: " + p.name);
  ctx.save();
  photoPath(ctx, p, offsetX, offsetY);
  ctx.clip();
  const g = cropGeometry(p);
  const centerX = g.x + g.w / 2;
  const centerY = g.y + g.h / 2;
  ctx.translate(centerX - offsetX, centerY - offsetY);
  ctx.rotate(((p.edits?.rotation ?? 0) * Math.PI) / 180);
  ctx.scale(p.edits?.flipX ? -1 : 1, p.edits?.flipY ? -1 : 1);
  const matrix = photoColorMatrix(p.edits);
  const adjusted = matrix ? adjustColors(image, matrix) : null;
  ctx.drawImage(adjusted ?? image, g.x - centerX, g.y - centerY, g.w, g.h);
  if (adjusted) {
    adjusted.width = 0;
    adjusted.height = 0;
  }
  ctx.restore();
  if (p.border) {
    photoPath(ctx, p, offsetX, offsetY);
    ctx.lineWidth = p.border;
    ctx.strokeStyle = p.borderColor;
    if (p.borderStyle === "dashed")
      ctx.setLineDash([p.border * 4, p.border * 2]);
    if (p.borderStyle === "dotted") {
      ctx.lineCap = "round";
      ctx.setLineDash([0, p.border * 2]);
    }
    if (p.borderStyle === "double" || p.borderStyle === "frame") {
      ctx.lineWidth = p.border / 3;
      ctx.stroke();
      const inset = (p.border * 2) / 3;
      if (p.box.w > inset * 2 && p.box.h > inset * 2) {
        photoPath(
          ctx,
          {
            ...p,
            radius: Math.max(0, p.radius - inset),
            box: {
              ...p.box,
              x: p.box.x + inset,
              y: p.box.y + inset,
              w: p.box.w - 2 * inset,
              h: p.box.h - 2 * inset,
            },
          },
          offsetX,
          offsetY,
        );
        if (p.borderStyle === "frame") {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = p.border / 2;
        }
        ctx.stroke();
      }
    } else ctx.stroke();
  }
}
