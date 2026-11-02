import { describe, expect, it, each } from "./assert";
import {
  defaultProject,
  applyPaper,
  parseProject,
  serializeProject,
  effectiveStyle,
  projectSchema,
  type PersonalEvent,
} from "../src/model";
import { occurrence, eventLabel, eventsFor } from "../src/engines/events";
import { namedays } from "../src/engines/namedays";
import {
  applyPreset,
  loadTemplate,
  templateOf,
} from "../src/engines/templates";
import { cropGeometry } from "../src/engines/images";
const birthday: PersonalEvent = {
  id: "anna-1",
  name: "Anna",
  kind: "birthday",
  month: 2,
  day: 29,
  birthYear: 2000,
  showAge: true,
  hidden: false,
};
describe("Personal events and namedays", () => {
  it("observes February 29 according to the chosen policy", () => {
    expect(occurrence(birthday, 2027, "feb28")).toEqual({
      year: 2027,
      month: 2,
      day: 28,
    });
    expect(occurrence(birthday, 2027, "mar1")).toEqual({
      year: 2027,
      month: 3,
      day: 1,
    });
    expect(occurrence(birthday, 2028, "mar1")).toEqual({
      year: 2028,
      month: 2,
      day: 29,
    });
  });
  it("suppresses birthdays before birth and never displays a negative age", () => {
    expect(occurrence(birthday, 1999, "feb28")).toBeNull();
    const future = {
      ...defaultProject(),
      events: [{ ...birthday, month: 3, day: 1, birthYear: 2030 }],
    };
    expect(eventsFor(future, { year: 2027, month: 3, day: 1 })).toHaveLength(0);
    expect(
      eventsFor(future, { year: 2027, month: 3, day: 1 }, true),
    ).toHaveLength(1);
    expect(eventLabel(birthday, 1999)).toBe("Anna");
    expect(eventLabel(birthday, 2027)).toBe("Anna (27)");
    expect(eventLabel({ ...birthday, birthYear: null }, 2027)).toBe("Anna");
  });
  it("keeps namesake people independently and personal namedays separate", () => {
    const p = defaultProject();
    p.events = [birthday, { ...birthday, id: "anna-2", kind: "nameday" }];
    expect(eventsFor(p, { year: 2027, month: 2, day: 28 })).toHaveLength(2);
    expect(namedays(2, 28)).not.toContain("Anna");
  });
  it("limits traditional labels to two names and restores original records without invention", () => {
    for (let m = 1; m <= 12; m++)
      for (let d = 1; d <= 31; d++)
        expect(namedays(m, d).length).toBeLessThanOrEqual(2);
    expect(namedays(7, 26)).toContain("Anna");
    expect(namedays(7, 26, { "7-26": ["Saját név"] })).toEqual(["Saját név"]);
    expect(namedays(7, 26, { "7-26": [] })).toEqual([]);
    expect(namedays(2, 29, {}, 2028)).toEqual(["Elemér", "Antónia"]);
    expect(namedays(2, 24, {}, 2028)).toEqual([]);
    expect(namedays(2, 25, {}, 2028)).toEqual(namedays(2, 24, {}, 2027));
  });
});
describe("Portable project and template model", () => {
  it("round trips settings, embedded images, overrides and personal events", () => {
    const p = defaultProject();
    p.events = [birthday];
    p.namedayOverrides = { "7-26": ["Anna", "Anikó"] };
    p.monthOverrides = {
      "3": { gridLine: 0.5, typography: { month: { size: 25 } } },
    };
    p.photos = [
      {
        id: "photo-1",
        name: "fotó.png",
        data: "data:image/png;base64,aGVsbG8=",
        pixelWidth: 1200,
        pixelHeight: 800,
        box: { x: 10, y: 10, w: 80, h: 60, locked: false },
        role: "photo",
        z: -1,
        zoom: 1.5,
        panX: 0.2,
        panY: -0.5,
        shape: "ellipse",
        radius: 3,
        border: 1,
        borderColor: "#ffffff",
        shadow: 2,
        opacity: 1,
        visible: true,
        aspectLock: true,
      },
    ];
    expect(parseProject(serializeProject(p))).toEqual(p);
    const crop = cropGeometry(p.photos[0]);
    expect(crop.w / crop.h).toBeCloseTo(1.5);
    expect(crop.w).toBeGreaterThanOrEqual(80);
    expect(crop.h).toBeGreaterThanOrEqual(60);
  });
  it("rejects unsupported versions, dangerous image URLs, duplicate IDs and malformed date records", () => {
    const p = defaultProject();
    expect(() => parseProject(JSON.stringify({ ...p, version: 99 }))).toThrow();
    expect(() =>
      parseProject(JSON.stringify({ ...p, extra: "malicious" })),
    ).toThrow();
    expect(
      projectSchema.safeParse({ ...p, events: [birthday, birthday] }).success,
    ).toBe(false);
    expect(
      projectSchema.safeParse({
        ...p,
        events: [{ ...birthday, month: 2, day: 30 }],
      }).success,
    ).toBe(false);
    expect(
      projectSchema.safeParse({ ...p, namedayOverrides: { "2-31": ["x"] } })
        .success,
    ).toBe(false);
  });
  it("inherits individual style properties after a month override", () => {
    const p = defaultProject();
    p.monthOverrides = { "3": { typography: { month: { size: 25 } } } };
    p.style.typography.date.color = "#112233";
    p.style.typography.month.color = "#445566";
    expect(effectiveStyle(p).typography.month.size).toBe(25);
    expect(effectiveStyle(p).typography.month.color).toBe("#445566");
    expect(effectiveStyle(p).typography.date.color).toBe("#112233");
    expect(effectiveStyle(p, 4).typography.month.size).toBe(
      p.style.typography.month.size,
    );
  });
  it("keeps project events and year when loading a reusable design template", () => {
    let p = defaultProject();
    p.year = 2400;
    p.events = [birthday];
    const styled = applyPreset(defaultProject(), "Elegáns");
    p = loadTemplate(p, templateOf(styled));
    expect(p.year).toBe(2400);
    expect(p.events).toEqual([birthday]);
    expect(p.style).toEqual(styled.style);
  });
  each(["A4", "A5", "A6", "A7"] as const)(
    "supports ISO %s dimensions and both orientations",
    (size) => {
      let p = { ...defaultProject(), mode: "annual" as const };
      const a = applyPaper(p, size, "portrait"),
        b = applyPaper(p, size, "landscape");
      expect(a.page.width).toBe(b.page.height);
      expect(a.page.height).toBe(b.page.width);
      expect(a.grid.x + a.grid.w).toBeLessThanOrEqual(a.page.width);
    },
  );
  it("validates custom dimensions", () => {
    const p = applyPaper(defaultProject(), "custom", "landscape", [220, 180]);
    expect(projectSchema.safeParse(p).success).toBe(true);
    expect(
      projectSchema.safeParse({ ...p, page: { ...p.page, width: 10 } }).success,
    ).toBe(false);
  });
});
