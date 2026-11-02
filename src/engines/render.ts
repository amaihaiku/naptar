import type { Project, Photo } from "../model";
import type { Scene, Clip } from "./layout";
import { advance, mmPerPt } from "./fonts";
import { paintPhoto } from "./images";
export function roundPath(b: Clip): string {
  const { x, y, w, h } = b,
    r = Math.min(b.r, w / 2, h / 2);
  return `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}
export function cakeRects(
  x: number,
  y: number,
  w: number,
  h: number,
): Array<[number, number, number, number]> {
  return [
    [x, y + h * 0.45, w, h * 0.55],
    [x + w * 0.17, y + h * 0.15, w * 0.14, h * 0.3],
    [x + w * 0.44, y, w * 0.14, h * 0.45],
    [x + w * 0.72, y + h * 0.15, w * 0.14, h * 0.3],
  ];
}
export function flowerCircles(
  x: number,
  y: number,
  w: number,
  h: number,
): Array<[number, number, number]> {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return [
      x + w / 2 + Math.cos(a) * w * 0.27,
      y + h / 2 + Math.sin(a) * h * 0.27,
      w * 0.18,
    ];
  });
}
export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  p: Project,
  scale: number,
): void {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fontKerning = "none";
  for (const n of scene.nodes) {
    ctx.save();
    ctx.globalAlpha = n.opacity;
    if (n.clip) {
      ctx.beginPath();
      ctx.roundRect(n.clip.x, n.clip.y, n.clip.w, n.clip.h, n.clip.r);
      ctx.clip();
    }
    if (n.kind === "rect") {
      ctx.beginPath();
      ctx.roundRect(n.x, n.y, n.w, n.h, Math.min(n.radius, n.w / 2, n.h / 2));
      if (n.fill !== "none") {
        ctx.fillStyle = n.fill;
        ctx.fill();
      }
      if (n.line && n.stroke !== "none") {
        ctx.strokeStyle = n.stroke;
        ctx.lineWidth = n.line;
        ctx.stroke();
      }
    }
    if (n.kind === "text") {
      const t = n.type;
      ctx.font = `${t.weight} ${t.size * mmPerPt}px "${t.family}"`;
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = t.color;
      let x = n.x;
      for (const c of n.text) {
        ctx.fillText(c, x, n.y);
        x += advance(c, t) + t.spacing;
      }
    }
    if (n.kind === "image") {
      const photo = p.photos.find((i) => i.id === n.photoId);
      if (photo) paintPhoto(ctx, photo);
    }
    if (n.kind === "icon") {
      ctx.fillStyle = n.color;
      if (n.icon === "cake")
        for (const r of cakeRects(n.x, n.y, n.w, n.h)) ctx.fillRect(...r);
      else
        for (const [x, y, r] of flowerCircles(n.x, n.y, n.w, n.h)) {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
    }
    ctx.restore();
  }
  ctx.restore();
}
export function rasterPhoto(p: Photo): HTMLCanvasElement {
  const scale = 300 / 25.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(p.box.w * scale);
  canvas.height = Math.round(p.box.h * scale);
  const ctx = canvas.getContext("2d", { colorSpace: "srgb" });
  if (!ctx) throw new Error("A böngésző nem támogatja a képexportot.");
  ctx.scale(canvas.width / p.box.w, canvas.height / p.box.h);
  paintPhoto(ctx, { ...p, border: 0 }, p.box.x, p.box.y);
  return canvas;
}
