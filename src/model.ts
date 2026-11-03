import { z } from "zod";
import fontManifest from "./data/fonts.json";
import { daysInMonth } from "./engines/date";
const num = (min: number, max: number) => z.number().finite().min(min).max(max);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const families = [
  "Noto Sans",
  "PT Serif",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Nunito",
  "Raleway",
  "DM Sans",
  "Oswald",
  "Roboto Condensed",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "EB Garamond",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Caveat",
  "Dancing Script",
  "Abril Fatface",
] as const;
export const categories = [
  "title",
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
    italic: z.boolean().default(false),
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
        title: typeSchema.default({
          family: "PT Serif",
          size: 32,
          weight: 400,
          italic: false,
          color: "#173d36",
          spacing: 0,
          lineHeight: 1.25,
          align: "center",
          uppercase: false,
        }),
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
    page: z.number().int().min(0).max(12).optional(),
  })
  .strict();
export type Photo = z.infer<typeof imageSchema>;
const styleOverrideSchema = styleSchema
  .omit({ typography: true })
  .partial()
  .extend({
    typography: z
      .object({
        title: typeSchema.partial(),
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
const coverSchema = z
  .object({
    title: z.string().max(100),
    showCalendar: z.boolean(),
    grid: boxSchema,
    titleBox: boxSchema,
    yearBox: boxSchema,
    style: styleSchema,
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
        margin: num(0, 50),
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
    yearBox: boxSchema.optional(),
    cover: coverSchema.optional(),
    events: z.array(eventSchema).max(2000),
    namedayOverrides: z.record(
      z.string().regex(/^(?:[1-9]|1[0-2])-(?:[1-9]|[12]\d|3[01])$/),
      z.array(z.string().trim().min(1).max(60)).max(2),
    ),
    photos: z.array(imageSchema).max(16),
  })
  .strict()
  .superRefine((p, ctx) => {
    for (const st of [p.style, p.cover?.style]) {
      if (!st) continue;
      for (const ty of Object.values(st.typography)) {
        if (
          !fontManifest.some(
            (f) =>
              f.family === ty.family &&
              f.weight === ty.weight &&
              Boolean("italic" in f && f.italic) === ty.italic,
          )
        )
          ctx.addIssue({
            code: "custom",
            message: `Nem elérhető betűváltozat: ${ty.family}.`,
          });
      }
    }

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
  italic: false,
});
export function defaultProject(): Project {
  const p: Project = {
    version: 1,
    title: "Az én naptáram",
    year: Number(
      new Intl.DateTimeFormat("en", {
        timeZone: "Europe/Budapest",
        year: "numeric",
      }).format(new Date()),
    ),
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
        title: text(32, "#173d36", "PT Serif", 400, "center"),
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
    titleBox: { x: 12, y: 24, w: 186, h: 18, locked: false },
    yearBox: { x: 12, y: 16, w: 186, h: 10, locked: false },
    events: [],
    namedayOverrides: {},
    photos: [],
  };
  return { ...p, cover: defaultCover(p) };
}
export function defaultCover(p: Project): NonNullable<Project["cover"]> {
  return {
    title: "Naptár",
    showCalendar: true,
    grid: {
      x: p.page.margin,
      y: p.page.height * 0.53,
      w: p.page.width - 2 * p.page.margin,
      h: p.page.height * 0.42,
      locked: false,
    },
    titleBox: {
      x: p.page.margin,
      y: p.page.height * 0.05,
      w: p.page.width - 2 * p.page.margin,
      h: 20,
      locked: false,
    },
    yearBox: {
      x: p.page.margin,
      y: p.page.height * 0.13,
      w: p.page.width - 2 * p.page.margin,
      h: 15,
      locked: false,
    },
    style: {
      ...p.style,
      typography: {
        ...p.style.typography,
        year: { ...p.style.typography.year, size: 28 },
        title: { ...p.style.typography.title, size: 32 },
      },
      pattern: "none",
      watermark: "",
    },
  };
}
export function viewProject(p: Project): Project {
  if (p.mode !== "annual") return p;
  const cover = p.cover ?? defaultCover(p);
  return {
    ...p,
    style: cover.style,
    grid: cover.grid,
    titleBox: cover.titleBox,
    yearBox: cover.yearBox,
  };
}
export function updateView(
  p: Project,
  patch: Partial<Pick<Project, "grid" | "titleBox" | "yearBox" | "style">>,
): Project {
  if (p.mode !== "annual") return { ...p, ...patch, monthOverrides: {} };
  return {
    ...p,
    cover: { ...(p.cover ?? defaultCover(p)), ...patch } as NonNullable<
      Project["cover"]
    >,
  };
}
export function pagePhotos(p: Project): Photo[] {
  const page = p.mode === "annual" ? 0 : p.month;
  return p.photos.filter(
    (photo) => photo.page === undefined || photo.page === page,
  );
}
export function yearBoxFor(p: Project): Box {
  return (
    viewProject(p).yearBox ?? { ...p.titleBox, y: p.titleBox.y - 8, h: 10 }
  );
}
export function effectiveStyle(p: Project, _month = p.month): Style {
  return viewProject(p).style;
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
    yearBox: {
      ...(p.yearBox ?? p.titleBox),
      x: m,
      y: h * 0.05,
      w: Math.max(10, w),
      h: 10,
    },
    titleBox: {
      ...p.titleBox,
      x: m,
      y: h * 0.08,
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
  if (p.mode === "monthly" && !(p.page.size === "A4" && size === "A4")) {
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
  const fitted = fitPage(next);
  if (p.cover) {
    const cover = p.cover;
    const sx = width / p.page.width,
      sy = height / p.page.height;
    const scale = (b: Box) => ({
      ...b,
      x: b.x * sx,
      y: b.y * sy,
      w: Math.max(10, b.w * sx),
      h: Math.max(10, b.h * sy),
    });
    fitted.cover = {
      ...cover,
      grid: scale(cover.grid),
      titleBox: scale(cover.titleBox),
      yearBox: scale(cover.yearBox),
    };
  }
  return fitted;
}
export function parseProject(source: string): Project {
  if (source.length > 80_000_000)
    throw new Error("A projekt legfeljebb 80 MB lehet.");
  const v: unknown = JSON.parse(source);
  if (v && typeof v === "object" && !Array.isArray(v) && "style" in v) {
    const st = (v as { style: unknown }).style;
    if (st && typeof st === "object" && "typography" in st) {
      const ty = st.typography;
      if (ty && typeof ty === "object" && !("title" in ty) && "month" in ty)
        Object.assign(ty, { title: ty.month });
    }
  }

  if (
    v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    "version" in v &&
    v.version === 1 &&
    "titleBox" in v &&
    !("yearBox" in v)
  ) {
    const old = v.titleBox;
    if (
      old &&
      typeof old === "object" &&
      "y" in old &&
      typeof old.y === "number" &&
      "h" in old &&
      typeof old.h === "number"
    ) {
      Object.assign(v, {
        yearBox: { ...old, h: Math.max(10, Math.min(old.h, 15)) },
      });
      if ("mode" in v && v.mode === "monthly")
        Object.assign(v, {
          titleBox: { ...old, y: old.y + 8, h: Math.max(10, old.h - 8) },
        });
    }
  }
  const result = projectSchema.safeParse(v);
  if (!result.success)
    throw new Error(
      "Hibás vagy nem támogatott projekt: " +
        result.error.issues
          .slice(0, 3)
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("; "),
    );
  const parsed = result.data;
  if (!parsed.cover && parsed.mode === "annual")
    parsed.cover = {
      ...defaultCover(parsed),
      title: "",
      grid: parsed.grid,
      yearBox: parsed.yearBox ?? parsed.titleBox,
      style: parsed.style,
    };
  return parsed;
}
export const serializeProject = (p: Project) =>
  JSON.stringify(projectSchema.parse(p));

export function editorProject(p: Project): Project {
  const next =
    p.page.size === "A4" ? p : applyPaper(p, "A4", p.page.orientation);
  return {
    ...next,
    monthOverrides: {},
    cover: next.cover ?? defaultCover(next),
  };
}
