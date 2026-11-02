import { z } from "zod";
import {
  defaultProject,
  projectSchema,
  type Style,
  type Project,
} from "../model";
export const presets = [
  "Minimalista",
  "Modern",
  "Elegáns",
  "Pasztell",
  "Fekete-fehér",
  "Fotónaptár",
] as const;
export function presetStyle(name: string): Style {
  const s = defaultProject().style;
  if (name === "Minimalista") return s;
  if (name === "Modern")
    return {
      ...s,
      background: "#f2f5f7",
      accent: "#3154b8",
      gridColor: "#ced7e9",
      radius: 0,
      border: 0.5,
      holidayColor: "#3154b8",
      holidayBackground: "#e6ebf9",
      typography: Object.fromEntries(
        Object.entries(s.typography).map(([k, v]) => [
          k,
          {
            ...v,
            family: "Montserrat",
            weight: k === "month" ? 700 : v.weight,
            color: k === "month" ? "#263d77" : v.color,
          },
        ]),
      ) as Style["typography"],
    };
  if (name === "Elegáns")
    return {
      ...s,
      background: "#fffaf0",
      gridLine: 0.12,
      borderColor: "#b29763",
      holidayColor: "#86642c",
      holidayBackground: "#f5eddc",
      typography: {
        ...s.typography,
        month: { ...s.typography.month, size: 35, spacing: 0.25 },
        date: { ...s.typography.date, family: "PT Serif", weight: 400 },
        weekday: {
          ...s.typography.weekday,
          family: "PT Serif",
          weight: 400,
          uppercase: true,
        },
      },
    };
  if (name === "Pasztell")
    return {
      ...s,
      background: "#fff8f5",
      cellBackground: "#fffdfb",
      holidayBackground: "#ede8f4",
      holidayColor: "#77618e",
      gridColor: "#e4d6dc",
      radius: 5,
      border: 0.2,
      padding: 2.5,
      typography: {
        ...s.typography,
        month: { ...s.typography.month, color: "#78627d", family: "PT Serif" },
        weekday: { ...s.typography.weekday, color: "#a77a8d" },
      },
    };
  if (name === "Fekete-fehér")
    return {
      ...s,
      ink: "#000000",
      accent: "#000000",
      holidayColor: "#000000",
      holidayBackground: "#e5e5e5",
      gridColor: "#000000",
      borderColor: "#000000",
      border: 0.5,
      radius: 0,
      typography: Object.fromEntries(
        Object.entries(s.typography).map(([k, v]) => [
          k,
          { ...v, color: "#000000" },
        ]),
      ) as Style["typography"],
    };
  return {
    ...s,
    background: "#f6f2e9",
    gridLine: 0,
    border: 0,
    radius: 0,
    gapX: 4,
    gapY: 4,
    typography: {
      ...s.typography,
      month: {
        ...s.typography.month,
        family: "Montserrat",
        weight: 700,
        size: 24,
      },
      year: { ...s.typography.year, size: 24 },
    },
  };
}
export function applyPreset(p: Project, name: string): Project {
  const next = { ...p, style: presetStyle(name), monthOverrides: {} };
  if (name === "Fotónaptár") {
    next.mode = "annual";
    next.grid = {
      ...p.grid,
      x: p.page.margin,
      y: p.page.height * 0.53,
      w: p.page.width - 2 * p.page.margin,
      h: p.page.height * 0.42,
    };
    next.titleBox = { ...p.titleBox, y: p.page.height * 0.46, h: 15 };
  }
  return next;
}
export function templateOf(p: Project) {
  const { page, style, grid, titleBox, monthOverrides, photos } = p;
  return {
    kind: "naptar-template",
    version: 1,
    page,
    style,
    grid,
    titleBox,
    monthOverrides,
    photos,
  };
}
const templateSchema = projectSchema
  .innerType()
  .pick({
    page: true,
    style: true,
    grid: true,
    titleBox: true,
    monthOverrides: true,
    photos: true,
  })
  .extend({ kind: z.literal("naptar-template"), version: z.literal(1) })
  .strict();
export function loadTemplate(p: Project, raw: unknown): Project {
  const { kind: _, version: __, ...rest } = templateSchema.parse(raw);
  return { ...p, ...rest };
}
