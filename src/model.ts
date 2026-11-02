import { z } from "zod";
import { daysInMonth } from "./engines/date";
const num = (min: number, max: number) => z.number().finite().min(min).max(max);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const families = ["Noto Sans", "PT Serif", "Montserrat"] as const;
export const categories = [
  "year",
  "month",
  "weekday",
  "date",
  "nameday",
  "birthday",
  "personalNameday",
] as const;
export type Category = (typeof categories)[number];
export const typeSchema = z
  .object({
    family: z.enum(families),
    size: num(2, 100),
    weight: z.union([z.literal(400), z.literal(700)]),
    color,
    spacing: num(-1, 5),
    lineHeight: num(0.8, 3),
    align: z.enum(["left", "center", "right"]),
    uppercase: z.boolean(),
  })
  .strict();
export type Typography = z.infer<typeof typeSchema>;
export const styleSchema = z
  .object({
    background: color,
    ink: color,
    accent: color,
    holidayColor: color,
    holidayBackground: color,
    cellBackground: color,
    gridColor: color,
    gridLine: num(0, 3),
    borderColor: color,
    border: num(0, 5),
    radius: num(0, 30),
    padding: num(0, 10),
    gapX: num(0, 20),
    gapY: num(0, 20),
    titleGap: num(-30, 50),
    headerHeight: num(3, 20),
    showWeekdays: z.boolean(),
    weekdayStyle: z.enum(["full", "short", "single"]),
    highlight: z.boolean(),
    showNamedays: z.boolean(),
    showYear: z.boolean(),
    pattern: z.enum(["none", "dots", "lines"]),
    watermark: z.string().max(80),
    watermarkOpacity: num(0.02, 0.6),
    typography: z
      .object({
        year: typeSchema,
        month: typeSchema,
        weekday: typeSchema,
        date: typeSchema,
        nameday: typeSchema,
        birthday: typeSchema,
        personalNameday: typeSchema,
      })
      .strict(),
  })
  .strict();
export type Style = z.infer<typeof styleSchema>;
export const boxSchema = z
  .object({
    x: num(-600, 1200),
    y: num(-600, 1200),
    w: num(10, 600),
    h: num(10, 600),
    locked: z.boolean(),
  })
  .strict();
export type Box = z.infer<typeof boxSchema>;
export const eventSchema = z
  .object({
    id: z.string().min(1).max(80),
    kind: z.enum(["birthday", "nameday"]),
    name: z.string().trim().min(1).max(80),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    birthYear: z.number().int().min(1).max(9999).nullable(),
    showAge: z.boolean(),
    hidden: z.boolean(),
  })
  .strict()
  .refine(
    (e) => e.day <= daysInMonth(2000, e.month),
    "Érvénytelen eseménydátum.",
  );
export type PersonalEvent = z.infer<typeof eventSchema>;
export const imageSchema = z
  .object({
    id: z.string().min(1).max(80),
    name: z.string().max(120),
    data: z
      .string()
      .max(40_000_000)
      .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/),
    pixelWidth: z.number().int().min(1).max(30000),
    pixelHeight: z.number().int().min(1).max(30000),
    box: boxSchema,
    role: z.enum(["photo", "background", "logo"]),
    z: num(-20, 20),
    zoom: num(1, 8),
    panX: num(-1, 1),
    panY: num(-1, 1),
    shape: z.enum(["rectangle", "ellipse", "circle"]),
    radius: num(0, 50),
    border: num(0, 10),
    borderColor: color,
    shadow: num(0, 15),
    opacity: num(0.05, 1),
    visible: z.boolean(),
    aspectLock: z.boolean(),
  })
  .strict();
export type Photo = z.infer<typeof imageSchema>;
const styleOverrideSchema = styleSchema
  .omit({ typography: true })
  .partial()
  .extend({
    typography: z
      .object({
        year: typeSchema.partial(),
        month: typeSchema.partial(),
        weekday: typeSchema.partial(),
        date: typeSchema.partial(),
        nameday: typeSchema.partial(),
        birthday: typeSchema.partial(),
        personalNameday: typeSchema.partial(),
      })
      .partial()
      .strict()
      .optional(),
  })
  .strict();
export const projectSchema = z
  .object({
    version: z.literal(1),
    title: z.string().min(1).max(100),
    year: z.number().int().min(1).max(9999),
    month: z.number().int().min(1).max(12),
    mode: z.enum(["annual", "monthly"]),
    page: z
      .object({
        size: z.enum(["A4", "A5", "A6", "A7", "custom"]),
        orientation: z.enum(["portrait", "landscape"]),
        width: num(40, 600),
        height: num(40, 600),
        margin: num(0, 40),
      })
      .strict(),
    firstDay: z.union([z.literal(1), z.literal(7)]),
    isoWeeks: z.boolean(),
    adjacent: z.boolean(),
    leapPolicy: z.enum(["feb28", "mar1"]),
    style: styleSchema,
    monthOverrides: z.record(
      z.string().regex(/^(?:[1-9]|1[0-2])$/),
      styleOverrideSchema,
    ),
    grid: boxSchema,
    titleBox: boxSchema,
    events: z.array(eventSchema).max(2000),
    namedayOverrides: z.record(
      z.string().regex(/^(?:[1-9]|1[0-2])-(?:[1-9]|[12]\d|3[01])$/),
      z.array(z.string().trim().min(1).max(60)).max(2),
    ),
    photos: z.array(imageSchema).max(16),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.page.size !== "custom") {
      const base = paperSizes[p.page.size];
      const expected =
        p.page.orientation === "portrait" ? base : [base[1], base[0]];
      if (p.page.width !== expected[0] || p.page.height !== expected[1])
        ctx.addIssue({
          code: "custom",
          message:
            "A szabványos papírméret adatai nem egyeznek a választott mérettel.",
        });
    }
    if (p.photos.reduce((n, i) => n + i.data.length, 0) > 75_000_000)
      ctx.addIssue({
        code: "custom",
        message: "A projekt összes képadatának mérete legfeljebb 75 MB lehet.",
      });
    const ids = [...p.events.map((e) => e.id), ...p.photos.map((e) => e.id)];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Ismétlődő azonosítók." });
    for (const key of Object.keys(p.namedayOverrides)) {
      const [month, day] = key.split("-").map(Number);
      if (day > daysInMonth(2000, month))
        ctx.addIssue({ code: "custom", message: "Érvénytelen névnapdátum." });
    }
    if (p.mode === "monthly" && p.page.size === "A7")
      ctx.addIssue({
        code: "custom",
        message: "Havi módban legalább A6 szükséges.",
      });
  });
export type Project = z.infer<typeof projectSchema>;
export const paperSizes = {
  A4: [210, 297],
  A5: [148, 210],
  A6: [105, 148],
  A7: [74, 105],
} as const;
const text = (
  size: number,
  color: string,
  family: Typography["family"] = "Noto Sans",
  weight: 400 | 700 = 400,
  align: Typography["align"] = "left",
): Typography => ({
  size,
  color,
  family,
  weight,
  align,
  spacing: 0,
  lineHeight: 1.25,
  uppercase: false,
});
export function defaultProject(): Project {
  return {
    version: 1,
    title: "Az én naptáram",
    year: 2027,
    month: 3,
    mode: "monthly",
    page: {
      size: "A4",
      orientation: "portrait",
      width: 210,
      height: 297,
      margin: 12,
    },
    firstDay: 1,
    isoWeeks: false,
    adjacent: false,
    leapPolicy: "feb28",
    style: {
      background: "#ffffff",
      ink: "#173d36",
      accent: "#b77c45",
      holidayColor: "#a44538",
      holidayBackground: "#f6eae3",
      cellBackground: "#ffffff",
      gridColor: "#d4dcd7",
      gridLine: 0.18,
      borderColor: "#b3c3ba",
      border: 0.3,
      radius: 1.5,
      padding: 2,
      gapX: 7,
      gapY: 7,
      titleGap: 10,
      headerHeight: 10,
      showWeekdays: true,
      weekdayStyle: "short",
      highlight: true,
      showNamedays: true,
      showYear: true,
      pattern: "none",
      watermark: "",
      watermarkOpacity: 0.1,
      typography: {
        year: text(12, "#a17953", "Montserrat", 700, "center"),
        month: text(32, "#173d36", "PT Serif", 400, "center"),
        weekday: text(8, "#53665f", "Montserrat", 700, "center"),
        date: text(14, "#173d36", "Noto Sans", 700, "left"),
        nameday: text(6.5, "#5e6d66", "Noto Sans", 400, "right"),
        birthday: text(7, "#a44538"),
        personalNameday: text(7, "#3d7460"),
      },
    },
    monthOverrides: {},
    grid: { x: 12, y: 61, w: 186, h: 216, locked: false },
    titleBox: { x: 12, y: 16, w: 186, h: 26, locked: false },
    events: [],
    namedayOverrides: {},
    photos: [],
  };
}
export function effectiveStyle(p: Project, month = p.month): Style {
  if (p.mode !== "monthly") return p.style;
  const o = p.monthOverrides[month];
  if (!o) return p.style;
  const typography = { ...p.style.typography };
  for (const key of categories)
    typography[key] = { ...typography[key], ...o.typography?.[key] };
  return { ...p.style, ...o, typography };
}
export function fitPage(p: Project): Project {
  const m = p.page.margin,
    w = p.page.width - 2 * m,
    h = p.page.height;
  return {
    ...p,
    grid: {
      ...p.grid,
      x: m,
      y: h * 0.205,
      w: Math.max(10, w),
      h: Math.max(10, h * 0.73),
    },
    titleBox: {
      ...p.titleBox,
      x: m,
      y: h * 0.05,
      w: Math.max(10, w),
      h: Math.max(10, h * 0.1),
    },
  };
}
export function applyPaper(
  p: Project,
  size: Project["page"]["size"],
  orientation: Project["page"]["orientation"],
  custom?: [number, number],
): Project {
  const base =
    size === "custom"
      ? (custom ?? [p.page.width, p.page.height])
      : paperSizes[size];
  const [a, b] = base;
  const [width, height] =
    size === "custom" ? [a, b] : orientation === "portrait" ? [a, b] : [b, a];
  const ratio = Math.min(width / p.page.width, height / p.page.height);
  let next = {
    ...p,
    page: {
      ...p.page,
      size,
      orientation,
      width,
      height,
      margin: Math.min(40, p.page.margin * ratio),
    },
  };
  if (p.mode === "monthly") {
    next.style = {
      ...p.style,
      padding: p.style.padding * ratio,
      headerHeight: Math.max(3, Math.min(20, p.style.headerHeight * ratio)),
      typography: Object.fromEntries(
        categories.map((k) => [
          k,
          {
            ...p.style.typography[k],
            size: Math.max(
              k === "month" ? 10 : k === "year" ? 6 : 4.5,
              Math.min(100, p.style.typography[k].size * ratio),
            ),
          },
        ]),
      ) as Style["typography"],
    };
  }
  return fitPage(next);
}
export function parseProject(source: string): Project {
  if (source.length > 80_000_000)
    throw new Error("A projekt legfeljebb 80 MB lehet.");
  const v: unknown = JSON.parse(source);
  const result = projectSchema.safeParse(v);
  if (!result.success)
    throw new Error(
      "Hibás vagy nem támogatott projekt: " +
        result.error.issues
          .slice(0, 3)
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("; "),
    );
  return result.data;
}
export const serializeProject = (p: Project) =>
  JSON.stringify(projectSchema.parse(p));
