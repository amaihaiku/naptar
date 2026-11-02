import type { Photo } from "../model";
export const imageCache = new Map<string, HTMLImageElement>();
export function cropGeometry(p: Photo) {
  const scale =
    Math.max(p.box.w / p.pixelWidth, p.box.h / p.pixelHeight) * p.zoom;
  const w = p.pixelWidth * scale,
    h = p.pixelHeight * scale;
  return {
    x: p.box.x + (p.box.w - w) / 2 + (p.panX * (w - p.box.w)) / 2,
    y: p.box.y + (p.box.h - h) / 2 + (p.panY * (h - p.box.h)) / 2,
    w,
    h,
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
  for (const p of photos) {
    const img = await decodeImage(p.data);
    if (
      img.naturalWidth !== p.pixelWidth ||
      img.naturalHeight !== p.pixelHeight
    )
      throw new Error("A tárolt képméret nem egyezik a képfájllal: " + p.name);
  }
}
export function pruneImages(photos: Photo[]) {
  const active = new Set(photos.map((p) => p.data));
  for (const key of imageCache.keys())
    if (!active.has(key)) imageCache.delete(key);
}
export async function readPhoto(
  file: File,
  pageWidth: number,
  pageHeight: number,
): Promise<Photo> {
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
  const w = pageWidth * 0.8,
    h = Math.max(
      10,
      Math.min(
        pageHeight * 0.4,
        (w * image.naturalHeight) / image.naturalWidth,
      ),
    );
  return {
    id: crypto.randomUUID(),
    name: file.name.slice(0, 120),
    data,
    pixelWidth: image.naturalWidth,
    pixelHeight: image.naturalHeight,
    box: { x: pageWidth * 0.1, y: 8, w, h, locked: false },
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
    aspectLock: true,
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
  ctx.drawImage(image, g.x - offsetX, g.y - offsetY, g.w, g.h);
  ctx.restore();
  if (p.border) {
    photoPath(ctx, p, offsetX, offsetY);
    ctx.lineWidth = p.border;
    ctx.strokeStyle = p.borderColor;
    ctx.stroke();
  }
}
