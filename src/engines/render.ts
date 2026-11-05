import { pagePhotos, type Project, type Photo } from "../model";
import type { Scene, Clip } from "./layout";
import { advance, mmPerPt } from "./fonts";
import { paintPhoto, photoPath } from "./images";
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
    if (n.kind === "group") {
      const { canvas, bounds } = rasterGroup(n, scene, p);
      ctx.drawImage(canvas, bounds.x, bounds.y, bounds.w, bounds.h);
      canvas.width = 0;
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
      // Rasterize glyphs at their device size, rather than hinting a 1–4 px
      // millimetre-space font and enlarging that result with the CTM. Firefox
      // otherwise quantizes small letters before the 300 DPI scaling step.
      const matrix = ctx.getTransform();
      const pixelScale = Math.max(
        Math.hypot(matrix.a, matrix.b),
        Math.hypot(matrix.c, matrix.d),
        1,
      );
      ctx.setTransform(
        matrix.a / pixelScale,
        matrix.b / pixelScale,
        matrix.c / pixelScale,
        matrix.d / pixelScale,
        matrix.e,
        matrix.f,
      );
      ctx.font = `${t.italic ? "italic" : "normal"} ${t.weight} ${t.size * mmPerPt * pixelScale}px "${t.family}"`;
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = t.color;
      let x = n.x;
      for (const c of n.text) {
        ctx.fillText(c, x * pixelScale, n.y * pixelScale);
        x += advance(c, t) + t.spacing;
      }
    }
    if (n.kind === "image") {
      const photo = pagePhotos(p, scene.page).find((i) => i.id === n.photoId);
      if (photo) {
        if (hasPhotoEffects(photo)) {
          const { canvas, bounds } = rasterPhoto(photo);
          ctx.drawImage(canvas, bounds.x, bounds.y, bounds.w, bounds.h);
          canvas.width = 0;
        } else paintPhoto(ctx, photo);
      }
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
export const hasPhotoEffects = (p: Photo) =>
  Boolean(
    (p.shadowStyle && p.shadowStyle.opacity > 0) ||
    (p.reflection && p.reflection.opacity > 0) ||
    (p.edgeFeather && p.edgeFeather.distance + p.edgeFeather.spread > 0) ||
    (p.border > 0 && p.borderStyle && p.borderStyle !== "solid"),
  );
export function photoArtworkBounds(p: Photo) {
  const shadow = p.shadowStyle?.opacity ? p.shadowStyle : undefined;
  const padding = Math.max(
    p.border / 2,
    shadow ? 3 * shadow.blur + shadow.distance + 5 : 0,
  );
  const reflection = p.reflection?.opacity ? p.box.h * p.reflection.length : 0;
  return {
    x: p.box.x - padding,
    y: p.box.y - padding,
    w: p.box.w + 2 * padding,
    h: p.box.h + 2 * padding + reflection,
  };
}
function photoCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  const ctx = canvas.getContext("2d", { colorSpace: "srgb" });
  if (!ctx) throw new Error("A böngésző nem támogatja a képexportot.");
  return { canvas, ctx };
}
export function rasterPhoto(p: Photo, resolution = 300 / 25.4) {
  const bounds = photoArtworkBounds(p);
  const scale = Math.min(
    resolution,
    Math.sqrt(36_000_000 / (bounds.w * bounds.h)),
  );
  const { canvas, ctx } = photoCanvas(bounds.w * scale, bounds.h * scale);
  const sx = canvas.width / bounds.w,
    sy = canvas.height / bounds.h;
  ctx.setTransform(sx, 0, 0, sy, -bounds.x * sx, -bounds.y * sy);
  const shadow = p.shadowStyle;
  if (shadow?.opacity) {
    ctx.save();
    const angle = (shadow.angle * Math.PI) / 180;
    const dx = Math.cos(angle) * shadow.distance,
      dy = Math.sin(angle) * shadow.distance;
    const alpha = Math.round(shadow.opacity * 255)
      .toString(16)
      .padStart(2, "0");
    ctx.fillStyle = shadow.color + alpha;
    if (shadow.blur > 0) {
      ctx.shadowColor = shadow.color + alpha;
      ctx.shadowBlur = shadow.blur * sx * 2;
      const far = bounds.w + 200;
      ctx.shadowOffsetX = far * sx;
      ctx.translate(-far, 0);
      ctx.fillStyle = "#000000";
    }
    photoPath(ctx, {
      ...p,
      box: { ...p.box, x: p.box.x + dx, y: p.box.y + dy },
    });
    ctx.fill();
    ctx.restore();
  }
  const border = p.border / 2;
  const front = {
    x: p.box.x - border,
    y: p.box.y - border,
    w: p.box.w + 2 * border,
    h: p.box.h + 2 * border,
  };
  const reflection = p.reflection;
  if (reflection?.opacity) {
    const source = photoCanvas(front.w * sx, front.h * sy);
    source.ctx.scale(
      source.canvas.width / front.w,
      source.canvas.height / front.h,
    );
    paintPhoto(source.ctx, p, front.x, front.y);
    const length = p.box.h * reflection.length;
    const mirrored = photoCanvas(source.canvas.width, length * sy);
    mirrored.ctx.translate(0, source.canvas.height);
    mirrored.ctx.scale(1, -1);
    mirrored.ctx.drawImage(source.canvas, 0, 0);
    mirrored.ctx.resetTransform();
    mirrored.ctx.globalCompositeOperation = "destination-in";
    const fade = mirrored.ctx.createLinearGradient(
      0,
      0,
      0,
      mirrored.canvas.height,
    );
    fade.addColorStop(0, `rgba(0,0,0,${reflection.opacity})`);
    fade.addColorStop(1, "transparent");
    mirrored.ctx.fillStyle = fade;
    mirrored.ctx.fillRect(0, 0, mirrored.canvas.width, mirrored.canvas.height);
    ctx.drawImage(source.canvas, front.x, front.y, front.w, front.h);
    ctx.drawImage(mirrored.canvas, front.x, front.y + front.h, front.w, length);
    source.canvas.width = 0;
    mirrored.canvas.width = 0;
  } else paintPhoto(ctx, p);
  return { canvas, bounds };
}

export function groupArtworkBounds(n: import("./layout").GroupNode) {
  const shadow = n.appearance.shadowStyle;
  const pad = shadow?.opacity ? shadow.distance + shadow.blur * 3 + 2 : 0;
  const extra = n.appearance.reflection?.opacity
    ? n.h * n.appearance.reflection.length
    : 0;
  return {
    x: n.x - pad,
    y: n.y - pad,
    w: n.w + pad * 2,
    h: n.h + pad * 2 + extra,
  };
}
export function rasterGroup(
  n: import("./layout").GroupNode,
  scene: Scene,
  p: Project,
  resolution = 300 / 25.4,
) {
  const bounds = groupArtworkBounds(n);
  const scale = Math.min(
    resolution,
    Math.sqrt(36_000_000 / (bounds.w * bounds.h)),
  );
  const front = photoCanvas(n.w * scale, n.h * scale);
  front.ctx.setTransform(scale, 0, 0, scale, -n.x * scale, -n.y * scale);
  if (n.appearance.background) {
    front.ctx.fillStyle = n.appearance.background;
    front.ctx.globalAlpha = n.appearance.backgroundOpacity ?? 1;
    front.ctx.fillRect(n.x, n.y, n.w, n.h);
    front.ctx.globalAlpha = 1;
  }
  renderCanvas(front.ctx, { ...scene, nodes: n.children }, p, 1);
  const { canvas, ctx } = photoCanvas(bounds.w * scale, bounds.h * scale);
  const x = (n.x - bounds.x) * scale,
    y = (n.y - bounds.y) * scale;
  const shadow = n.appearance.shadowStyle;
  if (shadow?.opacity) {
    ctx.save();
    const far = canvas.width + front.canvas.width + 100;
    ctx.shadowColor =
      shadow.color +
      Math.round(shadow.opacity * 255)
        .toString(16)
        .padStart(2, "0");
    ctx.shadowBlur = shadow.blur * scale * 2;
    ctx.shadowOffsetX =
      far + Math.cos((shadow.angle * Math.PI) / 180) * shadow.distance * scale;
    ctx.shadowOffsetY =
      Math.sin((shadow.angle * Math.PI) / 180) * shadow.distance * scale;
    ctx.drawImage(front.canvas, x - far, y);
    ctx.restore();
  }
  ctx.drawImage(front.canvas, x, y);
  const reflection = n.appearance.reflection;
  if (reflection?.opacity) {
    const mirror = photoCanvas(
      front.canvas.width,
      n.h * reflection.length * scale,
    );
    mirror.ctx.translate(0, front.canvas.height);
    mirror.ctx.scale(1, -1);
    mirror.ctx.drawImage(front.canvas, 0, 0);
    mirror.ctx.resetTransform();
    mirror.ctx.globalCompositeOperation = "destination-in";
    const gradient = mirror.ctx.createLinearGradient(
      0,
      0,
      0,
      mirror.canvas.height,
    );
    gradient.addColorStop(0, "rgba(0,0,0," + reflection.opacity + ")");
    gradient.addColorStop(1, "transparent");
    mirror.ctx.fillStyle = gradient;
    mirror.ctx.fillRect(0, 0, mirror.canvas.width, mirror.canvas.height);
    ctx.drawImage(mirror.canvas, x, y + front.canvas.height);
    mirror.canvas.width = 0;
  }
  front.canvas.width = 0;
  return { canvas, bounds };
}
