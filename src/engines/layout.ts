import {
  type Box,
  type Project,
  type Typography,
  effectiveStyle,
  viewProject,
  yearBoxFor,
  pagePhotos,
} from "../model";
import {
  type CivilDate,
  monthCells,
  months,
  weekdayLabels,
  weekday,
  isoWeek,
  dateKey,
} from "./date";
import { holidays } from "./holidays";
import { namedays } from "./namedays";
import { eventLabel, eventsFor } from "./events";
import { baseline, mmPerPt, textWidth, wrap, missingGlyphs } from "./fonts";
export interface Clip {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}
interface Common {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  opacity: number;
  clip?: Clip;
}
export interface RectNode extends Common {
  kind: "rect";
  fill: string;
  stroke: string;
  line: number;
  radius: number;
}
export interface TextNode extends Common {
  kind: "text";
  text: string;
  type: Typography;
}
export interface ImageNode extends Common {
  kind: "image";
  photoId: string;
}
export interface IconNode extends Common {
  kind: "icon";
  icon: "cake" | "flower";
  color: string;
}
export type SceneNode = RectNode | TextNode | ImageNode | IconNode;
export interface CellHit extends Box {
  date: CivilDate;
  inMonth: boolean;
}
export interface Issue {
  severity: "error" | "warning";
  message: string;
  code: string;
}
export interface Scene {
  width: number;
  height: number;
  nodes: SceneNode[];
  cells: CellHit[];
  issues: Issue[];
  month: number;
}
const box = (x: number, y: number, w: number, h: number): Box => ({
  x,
  y,
  w,
  h,
  locked: false,
});
export function buildScene(root: Project, month = root.month): Scene {
  const p = viewProject({ ...root, month });
  const photos = pagePhotos(p);
  const showCalendar = p.mode !== "annual" || (p.cover?.showCalendar ?? true);
  const s = effectiveStyle(p, month),
    nodes: SceneNode[] = [],
    cells: CellHit[] = [],
    issues: Issue[] = [];
  const headerBoxes: Array<[string, Box]> = [];
  let seq = 0;
  const common = (b: Pick<Box, "x" | "y" | "w" | "h">, z = 0) => ({
    ...b,
    id: `n${seq++}`,
    z,
    opacity: 1,
  });
  const rect = (
    b: Pick<Box, "x" | "y" | "w" | "h">,
    fill: string,
    stroke = "none",
    line = 0,
    radius = 0,
    z = 0,
    clip?: Clip,
  ) =>
    nodes.push({
      ...common(b, z),
      kind: "rect",
      fill,
      stroke,
      line,
      radius,
      clip,
    });
  function text(value: string, b: Box, t: Typography, z = 1, clip?: Clip) {
    const content = t.uppercase ? value.toLocaleUpperCase("hu") : value;
    const width = textWidth(content, t);
    let x = b.x;
    if (t.align === "center") x += (b.w - width) / 2;
    if (t.align === "right") x += b.w - width;
    if (width > b.w + 0.05)
      issues.push({
        severity: "error",
        code: "text-width",
        message: `Túl hosszú szöveg: „${content}”. Növeld a helyét vagy csökkentsd a betűméretét.`,
      });
    const missing = missingGlyphs(content, t);
    if (missing.length)
      issues.push({
        severity: "error",
        code: "glyph",
        message: `A betűtípusból hiányzik: ${missing.join(" ")}.`,
      });
    nodes.push({
      ...common({ ...b, x, w: width }, z),
      kind: "text",
      text: content,
      type: { ...t },
      y: b.y + baseline(t),
      clip,
    });
  }
  rect(
    box(0, 0, p.page.width, p.page.height),
    s.background,
    "none",
    0,
    0,
    -100,
  );
  if (s.pattern !== "none") {
    for (let y = 3; y < p.page.height; y += 8)
      for (let x = 3; x < p.page.width; x += 8)
        rect(
          box(x, y, s.pattern === "dots" ? 0.35 : 4, 0.35),
          s.gridColor,
          "none",
          0,
          0,
          -90,
        );
  }
  for (const photo of photos.filter((i) => i.visible)) {
    if (photo.shadow > 0)
      rect(
        {
          ...photo.box,
          x: photo.box.x + photo.shadow / 3,
          y: photo.box.y + photo.shadow / 3,
        },
        "#c2c7c3",
        "none",
        0,
        photo.radius,
        (photo.z < 0 ? -30 + photo.z : 30 + photo.z) - 0.1,
      );
    nodes.push({
      ...common(photo.box, photo.z < 0 ? -30 + photo.z : 30 + photo.z),
      kind: "image",
      photoId: photo.id,
      opacity: photo.opacity,
    });
  }
  function header(label: string, value: string, b: Box, t: Typography) {
    if (!value) return;
    text(value, b, t);
    const node = nodes[nodes.length - 1] as TextNode;
    headerBoxes.push([
      label,
      { ...b, x: node.x, w: node.w, h: t.size * mmPerPt * t.lineHeight },
    ]);
  }
  const title =
    p.mode === "annual" ? (p.cover?.title ?? "Naptár") : months[month - 1];
  const titleType = s.typography.title;
  if (s.showYear)
    header("Évszám", String(p.year), yearBoxFor(p), s.typography.year);
  if (title) header("Cím", title, p.titleBox, titleType);
  if (titleType.size * mmPerPt > p.titleBox.h)
    issues.push({
      severity: "warning",
      code: "title-size",
      message: "A cím betűmérete nagyobb a címmező magasságánál.",
    });
  const holidayMap = holidays(p.year);
  function calendar(m: number, region: Box, annual: boolean) {
    const raw = monthCells(p.year, m, p.firstDay),
      rows = raw.length / 7;
    let g = { ...region };
    let factor = 1;
    if (annual) {
      factor = Math.min(g.w / 58, g.h / 49);
      const mt = {
        ...s.typography.month,
        size: Math.max(2, s.typography.month.size * 0.375 * factor),
      };
      text(months[m - 1], box(g.x, g.y, g.w, 8 * factor), mt);
      g.y += 8 * factor;
      g.h -= 8 * factor;
    }
    const weekW = p.isoWeeks ? Math.min(6, g.w / 14) : 0;
    const col = (g.w - weekW) / 7;
    const header = s.showWeekdays ? (annual ? 5 * factor : s.headerHeight) : 0;
    const rowH = (g.h - header) / rows;
    const clip: Clip = { ...g, r: Math.min(s.radius, g.w / 2, g.h / 2) };
    rect(g, s.cellBackground, "none", 0, clip.r);
    if (s.showWeekdays) {
      const order = Array.from(
        { length: 7 },
        (_, i) => (p.firstDay - 1 + i) % 7,
      );
      for (let i = 0; i < 7; i++) {
        const labels =
          weekdayLabels[
            annual
              ? 2
              : s.weekdayStyle === "full"
                ? 0
                : s.weekdayStyle === "short"
                  ? 1
                  : 2
          ];
        const t = {
          ...s.typography.weekday,
          ...(annual
            ? { size: Math.max(2, s.typography.weekday.size * 0.6875 * factor) }
            : {}),
        };
        text(
          labels[order[i]],
          box(g.x + weekW + i * col, g.y + header * 0.25, col, header),
          t,
          2,
          clip,
        );
      }
    }
    raw.forEach((d, i) => {
      const r = Math.floor(i / 7),
        c = i % 7,
        b = box(g.x + weekW + c * col, g.y + header + r * rowH, col, rowH);
      const inMonth = d?.month === m && d.year === p.year;
      if (!d || (!inMonth && (annual || !p.adjacent))) return;
      if (inMonth) cells.push({ ...b, date: d, inMonth: true });
      const holiday = inMonth ? holidayMap.get(dateKey(d)) : undefined;
      const highlight =
        s.highlight && inMonth && (holiday || (!annual && weekday(d) >= 6));
      if (highlight) rect(b, s.holidayBackground, "none", 0, 0, 0, clip);
      const pad = annual ? 0.4 * factor : s.padding;
      const dt = {
        ...s.typography.date,
        ...(annual
          ? { size: Math.max(2, ((s.typography.date.size * 4) / 7) * factor) }
          : {}),
      };
      if (highlight) dt.color = s.holidayColor;
      if (!inMonth) dt.color = "#a7ada9";
      const numberBox = box(b.x + pad, b.y + pad, b.w - 2 * pad, b.h - pad);
      text(String(d.day), numberBox, dt, 2, clip);
      if (!annual) {
        let cursor = b.y + pad + dt.size * mmPerPt * dt.lineHeight + 0.7;
        if (s.showNamedays) {
          const nt = s.typography.nameday;
          const names = namedays(
            d.month,
            d.day,
            p.namedayOverrides,
            p.year,
          ).join(", ");
          const nameLines = wrap(names, nt, b.w - 2 * pad);
          for (const line of nameLines) {
            text(line, box(b.x + pad, cursor, b.w - 2 * pad, b.h), nt, 2, clip);
            cursor += nt.size * mmPerPt * nt.lineHeight;
          }
          cursor += 0.6;
        }
        if (inMonth) {
          let bottom = b.y + b.h - pad;
          for (const event of eventsFor(p, d)) {
            if (event.hidden) continue;
            const et =
              event.kind === "birthday"
                ? s.typography.birthday
                : s.typography.personalNameday;
            const iconSize = Math.min(2.5, et.size * mmPerPt);
            const lines = wrap(
              eventLabel(event, p.year),
              et,
              b.w - 2 * pad - iconSize - 0.8,
            );
            const height =
              lines.length * et.size * mmPerPt * et.lineHeight + 0.7;
            bottom -= height;
            if (bottom < cursor)
              issues.push({
                severity: "error",
                code: "overflow",
                message: `${months[m - 1]} ${d.day}.: a személyes események nem férnek el a cellában.`,
              });
            nodes.push({
              ...common(box(b.x + pad, bottom + 0.5, iconSize, iconSize), 3),
              kind: "icon",
              icon: event.kind === "birthday" ? "cake" : "flower",
              color: et.color,
              clip,
            });
            lines.forEach((line, index) =>
              text(
                line,
                box(
                  b.x + pad + iconSize + 0.8,
                  bottom + index * et.size * mmPerPt * et.lineHeight,
                  b.w - 2 * pad - iconSize - 0.8,
                  b.h,
                ),
                et,
                3,
                clip,
              ),
            );
          }
        }
        if (cursor > b.y + b.h - pad)
          issues.push({
            severity: "error",
            code: "overflow",
            message: `${months[m - 1]} ${d.day}.: a szöveg nem fér el a cellában. Csökkentsd a betűméretet, növeld a rácsot, vagy rejts el egy eseményt a dátumszerkesztőben.`,
          });
      }
    });
    if (p.isoWeeks) {
      for (let r = 0; r < rows; r++) {
        const d =
          raw.slice(r * 7, r * 7 + 7).find((d) => d && weekday(d) === 1) ??
          raw.slice(r * 7, r * 7 + 7).find(Boolean);
        if (d) {
          const t = {
            ...s.typography.weekday,
            size: annual ? Math.max(2, 4 * factor) : 5,
          };
          text(
            String(isoWeek(d).week),
            box(
              g.x,
              g.y + header + r * rowH + (annual ? 0.4 * factor : s.padding),
              weekW,
              rowH,
            ),
            t,
            3,
            clip,
          );
        }
      }
    }
    // Every shared inner edge is drawn once. All grid primitives share the rounded clip.
    if (!annual) {
      for (let c = 1; c < 7; c++)
        rect(
          box(g.x + weekW + c * col - s.gridLine / 2, g.y, s.gridLine, g.h),
          s.gridColor,
          "none",
          0,
          0,
          10,
          clip,
        );
      if (weekW)
        rect(
          box(g.x + weekW - s.gridLine / 2, g.y, s.gridLine, g.h),
          s.gridColor,
          "none",
          0,
          0,
          10,
          clip,
        );
      for (let r = 0; r < rows; r++) {
        if (r === 0 && !header) continue;
        rect(
          box(g.x, g.y + header + r * rowH - s.gridLine / 2, g.w, s.gridLine),
          s.gridColor,
          "none",
          0,
          0,
          10,
          clip,
        );
      }
    }
    if (s.border > 0) rect(g, "none", s.gridColor, s.border, clip.r, 11);
  }
  const grid = { ...p.grid, y: p.grid.y + (s.titleGap - 10) };
  for (const photo of photos.filter((i) => i.visible && i.z >= 0)) {
    const b = photo.box;
    if (
      b.x < grid.x + grid.w &&
      b.x + b.w > grid.x &&
      b.y < grid.y + grid.h &&
      b.y + b.h > grid.y
    )
      issues.push({
        severity: "warning",
        code: "overlap",
        message: `${photo.name}: a kép a naptárrács fölé nyúlik. Ellenőrizd a rétegsorrendet.`,
      });
  }
  if (showCalendar && p.mode === "annual") {
    const w = (grid.w - 2 * s.gapX) / 3,
      h = (grid.h - 3 * s.gapY) / 4;
    if (w <= 5 || h <= 10)
      issues.push({
        severity: "error",
        code: "annual-size",
        message: "Az éves naptár területe túl kicsi a hónapokhoz.",
      });
    else
      for (let m = 1; m <= 12; m++)
        calendar(
          m,
          box(
            grid.x + ((m - 1) % 3) * (w + s.gapX),
            grid.y + Math.floor((m - 1) / 3) * (h + s.gapY),
            w,
            h,
          ),
          true,
        );
    if ((Math.min(w / 58, h / 49) * s.typography.date.size * 4) / 7 < 6)
      issues.push({
        severity: "warning",
        code: "small-print",
        message:
          "Az éves dátumszámok 6 pt alattiak; a kis papírméreten nehezen olvashatók.",
      });
  } else if (showCalendar) calendar(month, grid, false);
  if (s.watermark) {
    const t = {
      ...s.typography.month,
      size: 18,
      align: "center" as const,
      color: s.accent,
    };
    text(s.watermark, box(5, p.page.height - 12, p.page.width - 10, 10), t, 50);
    nodes[nodes.length - 1].opacity = s.watermarkOpacity;
  }
  for (const [label, b] of [
    ...(showCalendar ? [["Naptárrács", grid]] : []),
    ...headerBoxes,
    ...photos.filter((i) => i.visible).map((i) => [i.name, i.box]),
  ] as [string, Box][]) {
    if (
      b.x < 0 ||
      b.y < 0 ||
      b.x + b.w > p.page.width ||
      b.y + b.h > p.page.height
    )
      issues.push({
        severity: "error",
        code: "outside",
        message: `${label}: az elem kilóg a lapból.`,
      });
    else if (
      b.x < p.page.margin ||
      b.y < p.page.margin ||
      b.x + b.w > p.page.width - p.page.margin ||
      b.y + b.h > p.page.height - p.page.margin
    )
      issues.push({
        severity: "warning",
        code: "margin",
        message: `${label}: az elem a beállított margóra nyúlik.`,
      });
  }
  for (const photo of photos.filter((i) => i.visible)) {
    const scale =
      Math.max(
        photo.box.w / photo.pixelWidth,
        photo.box.h / photo.pixelHeight,
      ) * photo.zoom;
    const dpi = 25.4 / scale;
    if (dpi < 250)
      issues.push({
        severity: "warning",
        code: "image-dpi",
        message: `${photo.name}: a tényleges képfelbontás ${Math.round(dpi)} DPI. Nyomtatáshoz nagyobb eredeti képet használj.`,
      });
  }
  if (p.events.some((e) => e.hidden))
    issues.push({
      severity: "warning",
      code: "hidden-event",
      message:
        "Vannak általad elrejtett események; ezek az exportban sem szerepelnek.",
    });
  if (p.mode === "monthly" && s.typography.nameday.size < 6)
    issues.push({
      severity: "warning",
      code: "small-print",
      message: "A névnapok betűmérete 6 pt alatti.",
    });
  return {
    width: p.page.width,
    height: p.page.height,
    nodes: nodes.sort((a, b) => a.z - b.z),
    cells,
    issues: [...new Map(issues.map((i) => [i.message, i])).values()],
    month,
  };
}
