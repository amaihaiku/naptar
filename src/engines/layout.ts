import {
  type Box,
  type Project,
  type Typography,
  type Appearance,
  elementAppearance,
  weekdayTypography,
  appearanceBounds,
  viewProject,
  yearBoxFor,
  pagePhotos,
  pageText,
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
import { calendarHolidays } from "./holidays";
import { namedays } from "./namedays";
import { eventLabel, eventsFor } from "./events";
import {
  inkBounds,
  baseline,
  mmPerPt,
  textWidth,
  wrap,
  missingGlyphs,
} from "./fonts";
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
  elementId?: string;
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
export interface GroupNode extends Common {
  kind: "group";
  children: SceneNode[];
  appearance: Appearance;
}
export type SceneNode = RectNode | TextNode | ImageNode | IconNode | GroupNode;
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
  page?: number;
  textBounds?: Record<string, Pick<Box, "x" | "y" | "w" | "h">>;
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
  const s = p.style,
    nodes: SceneNode[] = [],
    cells: CellHit[] = [],
    issues: Issue[] = [];
  const headerBoxes: Array<[string, Box]> = [];
  let seq = 0;
  let owner: string | undefined;
  const common = (b: Pick<Box, "x" | "y" | "w" | "h">, z = 0) => ({
    ...b,
    id: `n${seq++}`,
    z,
    opacity: 1,
    elementId: owner,
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
  for (const photo of photos.filter((i) => i.visible && i.data)) {
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
    owner = photo.id;
    nodes.push({
      ...common(photo.box, photo.z < 0 ? -30 + photo.z : 30 + photo.z),
      kind: "image",
      photoId: photo.id,
      opacity: photo.opacity,
    });
  }
  owner = undefined;
  const textBounds: NonNullable<Scene["textBounds"]> = {};
  function measureText(id: string, first: number) {
    for (const node of nodes.slice(first)) {
      if (node.kind !== "text") continue;
      const ink = inkBounds(node.text, node.type);
      if (!ink) continue;
      let x = node.x + ink.x,
        y = node.y + ink.y;
      let right = x + ink.w,
        bottom = y + ink.h;
      if (node.clip) {
        x = Math.max(x, node.clip.x);
        y = Math.max(y, node.clip.y);
        right = Math.min(right, node.clip.x + node.clip.w);
        bottom = Math.min(bottom, node.clip.y + node.clip.h);
      }
      if (x >= right || y >= bottom) continue;
      const prior = textBounds[id];
      if (prior) {
        right = Math.max(right, prior.x + prior.w);
        bottom = Math.max(bottom, prior.y + prior.h);
        x = Math.min(x, prior.x);
        y = Math.min(y, prior.y);
      }
      textBounds[id] = { x, y, w: right - x, h: bottom - y };
    }
  }
  function header(
    id: string,
    label: string,
    value: string,
    b: Box,
    t: Typography,
  ) {
    if (!value) return;
    owner = id;
    const first = nodes.length;
    text(value, b, t);
    measureText(id, first);
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
    header("year", "Évszám", String(p.year), yearBoxFor(p), s.typography.year);
  if (title) header("title", "Cím", title, p.titleBox, titleType);
  if (titleType.size * mmPerPt > p.titleBox.h)
    issues.push({
      severity: "warning",
      code: "title-size",
      message: "A cím betűmérete nagyobb a címmező magasságánál.",
    });
  for (const item of pageText(p)) {
    owner = item.id;
    const t = item.typography;
    const lineHeight = t.size * mmPerPt * t.lineHeight;
    const lines = item.text
      .split("\n")
      .flatMap((line) => (line.trim() ? wrap(line, t, item.box.w) : [""]));
    const height = lines.length * lineHeight;
    const extra = Math.max(0, item.box.h - height);
    const top =
      item.box.y +
      (t.vertical === "bottom"
        ? extra
        : t.vertical === "middle"
          ? extra / 2
          : 0);
    const clip = { ...item.box, r: 0 };
    const first = nodes.length;
    lines.forEach((line, i) => {
      if (line)
        text(line, { ...item.box, y: top + i * lineHeight }, t, 60, clip);
    });
    measureText(item.id, first);
    if (height > item.box.h && item.text)
      issues.push({
        severity: "error",
        code: "text-height",
        message: "A hozzáadott szöveg nem fér el a szövegdobozban.",
      });
    if (item.text) headerBoxes.push(["Szövegdoboz", item.box]);
  }
  owner = "grid";
  const holidayDays = new Map<string, ReturnType<typeof calendarHolidays>>();
  for (const item of calendarHolidays(p)) {
    const key = item.month + "-" + item.day;
    holidayDays.set(key, [...(holidayDays.get(key) ?? []), item]);
  }
  function calendar(m: number, region: Box, annual: boolean) {
    const raw = monthCells(
        p.year,
        m,
        p.firstDay,
        !annual && p.adjacent ? 5 : 0,
      ),
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
    const weekW = !annual && p.isoWeeks ? Math.min(6, g.w / 14) : 0;
    const col = (g.w - weekW) / 7;
    const header = s.showWeekdays ? (annual ? 5 * factor : s.headerHeight) : 0;
    const rowH = (g.h - header) / rows;
    const clip: Clip = {
      ...g,
      r: Math.min(s.radius * factor, g.w / 2, g.h / 2),
    };
    rect(
      g,
      elementAppearance({ ...root, month }, "grid").background
        ? "none"
        : s.cellBackground,
      "none",
      0,
      clip.r,
    );
    if (s.showWeekdays) {
      const priorOwner = owner;
      const headerStart = nodes.length;
      owner = annual ? "grid" : "header";
      const weekdayType = weekdayTypography(p);
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
          ...weekdayType,
          ...(annual
            ? { size: Math.max(2, s.typography.weekday.size * 0.6875 * factor) }
            : {}),
        };
        text(
          labels[order[i]],
          box(
            g.x + weekW + i * col + (annual ? 0 : s.padding),
            g.y + header * 0.25,
            col - (annual ? 0 : 2 * s.padding),
            header,
          ),
          t,
          2,
          clip,
        );
      }
      const appearance = elementAppearance({ ...root, month }, "header");
      if (
        annual &&
        Object.values(appearance).some((value) => value !== undefined)
      ) {
        const children = nodes.splice(headerStart);
        nodes.push({
          ...common(
            appearanceBounds(
              box(g.x + weekW, g.y, g.w - weekW, header),
              appearance,
            ),
            2,
          ),
          kind: "group",
          children,
          appearance,
          opacity: appearance.opacity ?? 1,
        });
      }
      owner = priorOwner;
    }
    raw.forEach((d, i) => {
      const r = Math.floor(i / 7),
        c = i % 7,
        b = box(g.x + weekW + c * col, g.y + header + r * rowH, col, rowH);
      const inMonth = d?.month === m && d.year === p.year;
      if (!d || (!inMonth && (annual || !p.adjacent))) return;
      if (inMonth) cells.push({ ...b, date: d, inMonth: true });
      const listedHolidays = inMonth ? (holidayDays.get(dateKey(d)) ?? []) : [];
      const coverHighlight = annual && p.cover?.highlightDays;
      const events =
        (!annual || coverHighlight) && inMonth
          ? eventsFor(p, d).filter((event) => !event.hidden)
          : [];
      const customBackground = events.some((event) => event.coloredDay);
      const publicHoliday = events.some((event) => event.publicHoliday);
      const highlightedHoliday = listedHolidays.some((item) => item.highlight);
      const dayTextColor =
        inMonth &&
        (listedHolidays.length > 0 || publicHoliday || customBackground)
          ? s.holidayTextColor
          : undefined;
      const highlight =
        inMonth &&
        (!annual || coverHighlight) &&
        (highlightedHoliday ||
          (s.highlight && (publicHoliday || weekday(d) >= 6)));
      if (highlight || customBackground)
        rect(
          b,
          customBackground
            ? (s.customHolidayBackground ?? s.holidayBackground)
            : s.holidayBackground,
          "none",
          0,
          0,
          0,
          clip,
        );
      const pad = annual ? 0.4 * factor : s.padding;
      const dt = {
        ...s.typography.date,
        ...(annual
          ? {
              size: Math.max(2, ((s.typography.date.size * 4) / 7) * factor),
              align: "center" as const,
            }
          : {}),
      };
      if (highlight || publicHoliday) dt.color = s.holidayColor;
      if (!inMonth) dt.color = "#a7ada9";
      const holidayName =
        !annual && inMonth
          ? listedHolidays
              .filter((item) => item.showName && item.name.trim())
              .map((item) => item.name)
              .join("\n")
          : undefined;
      const holidayType: Typography = {
        ...s.typography.weekday,
        size: Math.max(2, Math.min(6.5, (p.page.width / 210) * 6.5)),
        align: "center",
        color: dayTextColor ?? s.holidayColor,
      };
      const holidayLines = holidayName
        ? wrap(holidayName, holidayType, b.w - 2 * pad)
        : [];
      const holidayLineHeight =
        holidayType.size * mmPerPt * holidayType.lineHeight;
      const holidayHeight = holidayLines.length * holidayLineHeight;
      const holidayTop = b.y + b.h - pad - holidayHeight;
      const contentLimit = holidayTop - (holidayHeight ? 0.7 : 0);
      const positionY = (
        vertical: Typography["vertical"],
        height: number,
        fallback: number,
      ) =>
        vertical === "middle"
          ? b.y + (b.h - holidayHeight - height) / 2
          : vertical === "bottom"
            ? contentLimit - height
            : vertical === "top"
              ? b.y + pad
              : fallback;
      const dateHeight = dt.size * mmPerPt * dt.lineHeight;
      const dateY = annual
        ? b.y + (b.h - dateHeight) / 2
        : positionY(dt.vertical, dateHeight, b.y + pad);
      const numberBox = box(b.x + pad, dateY, b.w - 2 * pad, b.h - pad);
      text(String(d.day), numberBox, dt, 2, clip);
      if (!annual) {
        let contentBottom = dateY + dateHeight;
        let cursor = contentBottom + 0.7;
        if (s.showNamedays) {
          const namedayType = s.typography.nameday;
          const nt = dayTextColor
            ? { ...namedayType, color: dayTextColor }
            : namedayType;
          const names = namedays(d.month, d.day, p.namedayOverrides, d.year);
          const availableWidth = b.w - 2 * pad;
          const nameLines = !names.length
            ? []
            : s.namedayLayout === "stack"
              ? names
              : s.namedayLayout === "row"
                ? [names.join(", ")]
                : wrap(names.join(", "), nt, availableWidth);
          const lineHeight = nt.size * mmPerPt * nt.lineHeight;
          const nameHeight = nameLines.length * lineHeight;
          const nameWidth = Math.max(
            0,
            ...nameLines.map((line) =>
              textWidth(nt.uppercase ? line.toLocaleUpperCase("hu") : line, nt),
            ),
          );
          const alignment =
            nt.align === "right" ? 1 : nt.align === "center" ? 0.5 : 0;
          const nameX =
            b.x +
            pad +
            (availableWidth - nameWidth) * alignment +
            (s.namedayX ?? 0);
          let nameY =
            positionY(nt.vertical, nameHeight, cursor) + (s.namedayY ?? 0);
          if (
            names.length &&
            (nameX < b.x || nameX + nameWidth > b.x + b.w || nameY < b.y)
          )
            issues.push({
              severity: "error",
              code: "nameday-outside",
              message: `${months[m - 1]} ${d.day}.: a névnapok kilógnak a cellából.`,
            });
          for (const line of nameLines) {
            text(line, box(nameX, nameY, nameWidth, lineHeight), nt, 2, clip);
            nameY += lineHeight;
          }
          if (!names.length) nameY = contentBottom;
          contentBottom = Math.max(contentBottom, nameY);
          cursor = contentBottom + 0.6;
        }
        if (inMonth) {
          let bottom = contentLimit;
          const cellClip = { ...b, r: 0 };
          holidayLines.forEach((line, i) =>
            text(
              line,
              box(
                b.x + pad,
                holidayTop + i * holidayLineHeight,
                b.w - 2 * pad,
                holidayLineHeight,
              ),
              holidayType,
              3,
              cellClip,
            ),
          );
          for (const event of events) {
            const eventType =
              event.kind === "birthday"
                ? s.typography.birthday
                : event.kind === "other"
                  ? (s.typography.otherEvent ?? s.typography.personalNameday)
                  : s.typography.personalNameday;
            const et = dayTextColor
              ? { ...eventType, color: dayTextColor }
              : eventType;
            const iconSize =
              event.kind === "other" ? 0 : Math.min(2.5, et.size * mmPerPt);
            const iconSpace = iconSize ? iconSize + 0.8 : 0;
            const lines = wrap(
              eventLabel(event, p.year),
              et,
              b.w - 2 * pad - iconSpace,
            );
            const height =
              lines.length * et.size * mmPerPt * et.lineHeight + 0.7;
            bottom -= height;
            const [dx, dy] = s.eventOffsets?.[event.kind] ?? [0, 0];
            if (
              bottom + dy < cursor ||
              bottom + dy + height > (holidayHeight ? holidayTop : b.y + b.h) ||
              Math.abs(dx) >= b.w - 2 * pad
            )
              issues.push({
                severity: "error",
                code: "overflow",
                message: `${months[m - 1]} ${d.day}.: a személyes események nem férnek el a cellában.`,
              });
            if (iconSize)
              nodes.push({
                ...common(
                  box(b.x + pad + dx, bottom + dy + 0.5, iconSize, iconSize),
                  3,
                ),
                kind: "icon",
                icon: event.kind === "birthday" ? "cake" : "flower",
                color: et.color,
                clip: cellClip,
              });
            lines.forEach((line, index) =>
              text(
                line,
                box(
                  b.x + pad + iconSpace + dx,
                  bottom + dy + index * et.size * mmPerPt * et.lineHeight,
                  b.w - 2 * pad - iconSpace,
                  b.h,
                ),
                et,
                3,
                clip,
              ),
            );
          }
        }
        if (contentBottom > contentLimit + 0.001)
          issues.push({
            severity: "error",
            code: "overflow",
            message: `${months[m - 1]} ${d.day}.: a szöveg nem fér el a cellában. Csökkentsd a betűméretet, növeld a rácsot, vagy rejts el egy eseményt a dátumszerkesztőben.`,
          });
      }
    });
    if (weekW) {
      for (let r = 0; r < rows; r++) {
        const d =
          raw.slice(r * 7, r * 7 + 7).find((d) => d && weekday(d) === 1) ??
          raw.slice(r * 7, r * 7 + 7).find(Boolean);
        if (d) {
          const t = {
            ...(s.typography.week ?? { ...s.typography.weekday, size: 5 }),
          };
          const lineHeight = t.size * mmPerPt * t.lineHeight;
          const offsetY =
            t.vertical === "middle"
              ? (rowH - lineHeight) / 2
              : t.vertical === "bottom"
                ? rowH - s.padding - lineHeight
                : s.padding;
          text(
            String(isoWeek(d).week),
            box(
              g.x + (s.weekX ?? 0),
              g.y + header + r * rowH + offsetY + (s.weekY ?? 0),
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
    const gridLine = s.gridLine * factor;
    if (gridLine > 0) {
      for (let c = 1; c < 7; c++)
        rect(
          box(g.x + weekW + c * col - gridLine / 2, g.y, gridLine, g.h),
          s.gridColor,
          "none",
          0,
          0,
          10,
          clip,
        );
      if (weekW)
        rect(
          box(g.x + weekW - gridLine / 2, g.y, gridLine, g.h),
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
          box(g.x, g.y + header + r * rowH - gridLine / 2, g.w, gridLine),
          s.gridColor,
          "none",
          0,
          0,
          10,
          clip,
        );
      }
    }
    if (s.border > 0)
      rect(g, "none", s.gridColor, s.border * factor, clip.r, 11);
  }
  const grid = { ...p.grid, y: p.grid.y + (s.titleGap - 10) };
  for (const photo of photos.filter((i) => i.visible && i.data && i.z >= 0)) {
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
  function checkBounds(label: string, b: Pick<Box, "x" | "y" | "w" | "h">) {
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
      b.y < (p.page.marginY ?? p.page.margin) ||
      b.x + b.w > p.page.width - p.page.margin ||
      b.y + b.h > p.page.height - (p.page.marginY ?? p.page.margin)
    )
      issues.push({
        severity: "warning",
        code: "margin",
        message: `${label}: az elem a beállított margóra nyúlik.`,
      });
  }
  if (showCalendar) checkBounds("Naptárrács", grid);
  for (const [label, bounds] of headerBoxes) checkBounds(label, bounds);
  for (const photo of photos.filter((i) => i.visible && i.data))
    checkBounds(
      photo.name,
      photo.background ? appearanceBounds(photo.box, photo) : photo.box,
    );
  for (const photo of photos.filter((i) => i.visible && i.data)) {
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
  const configured = [
    "header",
    "grid",
    "title",
    "year",
    ...pageText(p).map((item) => item.id),
  ];
  for (const id of configured) {
    const appearance = elementAppearance({ ...root, month }, id);
    if (!Object.values(appearance).some((value) => value !== undefined))
      continue;
    const selected = nodes.filter(
      (node) =>
        node.elementId === id || (id === "grid" && node.elementId === "header"),
    );
    if (!selected.length) continue;
    let bounds: Pick<Box, "x" | "y" | "w" | "h"> | undefined;
    if (id === "grid") bounds = grid;
    else if (id === "header") {
      if (p.mode === "annual") continue;
      const week = p.isoWeeks ? Math.min(6, grid.w / 14) : 0;
      bounds = {
        x: grid.x + week,
        y: grid.y,
        w: grid.w - week,
        h: s.headerHeight,
      };
    } else bounds = textBounds[id];
    if (!bounds) continue;
    const chosen = new Set(selected);
    for (let i = nodes.length - 1; i >= 0; i--)
      if (chosen.has(nodes[i])) nodes.splice(i, 1);
    nodes.push({
      ...common(
        appearanceBounds(bounds, appearance),
        Math.min(...selected.map((node) => node.z)),
      ),
      elementId: id,
      kind: "group",
      children: selected.sort((a, b) => a.z - b.z),
      appearance,
      opacity: appearance.opacity ?? 1,
    });
  }
  function checkExpandedGroups(items: SceneNode[]) {
    for (const node of items) {
      if (node.kind !== "group") continue;
      if (
        node.appearance.background &&
        (node.appearance.paddingX || node.appearance.paddingY)
      )
        checkBounds("Kibővített elemháttér", node);
      checkExpandedGroups(node.children);
    }
  }
  checkExpandedGroups(nodes);
  return {
    width: p.page.width,
    height: p.page.height,
    nodes: nodes.sort((a, b) => a.z - b.z),
    cells,
    issues: [...new Map(issues.map((i) => [i.message, i])).values()],
    month,
    page: p.mode === "annual" ? 0 : month,
    textBounds,
  };
}
