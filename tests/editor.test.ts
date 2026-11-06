import { beforeAll, describe, it, expect } from "./assert";
import { readFileSync } from "node:fs";
import {
  defaultProject,
  viewProject,
  updateView,
  pagePhotos,
  parseProject,
  serializeProject,
  applyPaper,
} from "../src/model";
import { calendarHolidays } from "../src/engines/holidays";
import { buildScene } from "../src/engines/layout";
import {
  registerFont,
  fontVariants,
  validTypography,
  getFont,
} from "../src/engines/fonts";
import manifest from "../src/data/fonts.json";
beforeAll(() => {
  for (const f of manifest)
    registerFont(
      `${f.family}-${f.weight}${"italic" in f && f.italic ? "-italic" : ""}`,
      readFileSync(new URL("../public/fonts/" + f.file, import.meta.url)),
    );
});
describe("Requested cover/month and typography behavior", () => {
  it("adds the following month's first week only when adjacent days are enabled", () => {
    const p = { ...defaultProject(), year: 2027, month: 2 };
    const regular = buildScene(p);
    const extended = buildScene({ ...p, adjacent: true });
    const dates = (scene: ReturnType<typeof buildScene>) =>
      scene.nodes.flatMap((node) =>
        node.kind === "text" && node.z === 2 && /^\d+$/.test(node.text)
          ? [node.text]
          : [],
      );
    expect(dates(regular)).toHaveLength(28);
    expect(dates(extended)).toHaveLength(35);
    expect(dates(extended).slice(28)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
    ]);
  });
  it("renders a custom event and applies its selected date color and background", () => {
    const p = { ...defaultProject(), year: 2027, month: 3 };
    p.style.highlight = false;
    p.style.customHolidayBackground = "#fedcba";
    p.style.holidayTextColor = "#193264";
    p.namedayOverrides = { "3-15": ["Ünnepi névnap"] };
    p.events = [
      {
        id: "other",
        kind: "other",
        name: "Iskolai ünnep",
        month: 3,
        day: 15,
        birthYear: null,
        showAge: false,
        hidden: false,
        publicHoliday: true,
        coloredDay: true,
      },
    ];
    const original = buildScene(p);
    p.style.eventOffsets = { other: [2, -1] };
    const scene = buildScene(p);
    const findText = (scene: ReturnType<typeof buildScene>, label: string) =>
      scene.nodes.find((n) => n.kind === "text" && n.text === label)!;
    const event = findText(scene, "Iskolai ünnep");
    const holiday = findText(scene, "Nemzeti ünnep");
    expect(event.kind === "text" && event.type.color).toBe("#193264");
    expect(holiday.kind === "text" && holiday.type.color).toBe("#193264");
    const nameday = findText(scene, "Ünnepi névnap");
    expect(nameday.kind === "text" && nameday.type.color).toBe("#193264");
    expect(event.x - findText(original, "Iskolai ünnep").x).toBe(2);
    expect(event.y < holiday.y).toBe(true);
    expect(
      scene.nodes.some((n) => n.kind === "text" && n.text === "Iskolai ünnep"),
    ).toBe(true);
    expect(
      scene.nodes.some((n) => n.kind === "rect" && n.fill === "#fedcba"),
    ).toBe(true);
    expect(
      scene.nodes.some(
        (n) =>
          n.kind === "text" &&
          n.text === "15" &&
          n.type.color === p.style.holidayColor,
      ),
    ).toBe(true);
  });
  it("highlights Christmas Eve without its label and retains editable holiday settings", () => {
    let p = { ...defaultProject(), year: 2027, month: 12 };
    const rectForDay = (
      project: ReturnType<typeof defaultProject>,
      day: number,
    ) => {
      const scene = buildScene(project);
      const cell = scene.cells.find((c) => c.date.day === day)!;
      return scene.nodes.some(
        (n) =>
          n.kind === "rect" &&
          n.x === cell.x &&
          n.y === cell.y &&
          n.fill === project.style.holidayBackground,
      );
    };
    expect(rectForDay(p, 24)).toBe(true);
    p = {
      ...p,
      holidayOverrides: {
        "fixed-12-24": {
          name: "Saját ünnep",
          showName: false,
          highlight: true,
        },
      },
    };
    expect(
      buildScene(p).nodes.some(
        (n) => n.kind === "text" && n.text === "Saját ünnep",
      ),
    ).toBe(false);
    expect(rectForDay(p, 24)).toBe(true);
    p.holidayOverrides!["fixed-12-24"] = null;
    expect(rectForDay(p, 24)).toBe(false);
    const saved = parseProject(serializeProject(p));
    expect(
      calendarHolidays(saved).some((day) => day.id === "fixed-12-24"),
    ).toBe(false);
    const renamed = {
      ...p,
      holidayOverrides: {
        "easter-1": { name: "Húsvéti pihenő", showName: true, highlight: true },
      },
    };
    expect(
      calendarHolidays(renamed).find((day) => day.id === "easter-1")?.day,
    ).toBe(29);
    expect(
      calendarHolidays({ ...renamed, year: 2028 }).find(
        (day) => day.id === "easter-1",
      )?.name,
    ).toBe("Húsvéti pihenő");
  });
  it("defaults to the current Budapest year", () =>
    expect(defaultProject().year).toBe(
      Number(
        new Intl.DateTimeFormat("en", {
          timeZone: "Europe/Budapest",
          year: "numeric",
        }).format(new Date()),
      ),
    ));
  it("keeps cover geometry and typography separate from the shared twelve-month style", () => {
    let p = defaultProject();
    const monthly = p.style.typography.title.size;
    p = { ...p, mode: "annual" };
    const old = viewProject(p);
    p = updateView(p, {
      titleBox: { ...old.titleBox, x: 45 },
      style: {
        ...old.style,
        typography: {
          ...old.style.typography,
          title: { ...old.style.typography.title, size: 24 },
        },
      },
    });
    expect(p.style.typography.title.size).toBe(monthly);
    expect(p.titleBox.x).toBe(12);
    expect(viewProject(p).titleBox.x).toBe(45);
    expect(parseProject(serializeProject(p)).cover).toEqual(p.cover);
  });
  it("hides only the cover calendar, retaining the title, year and images model", () => {
    const p = { ...defaultProject(), mode: "annual" as const };
    p.cover = { ...p.cover!, showCalendar: false };
    const scene = buildScene(p);
    expect(scene.cells).toHaveLength(0);
    expect(
      scene.nodes.some((n) => n.kind === "text" && n.text === String(p.year)),
    ).toBe(true);
    expect(
      scene.nodes.some((n) => n.kind === "text" && n.text === "Naptár"),
    ).toBe(true);
  });
  it("moves year and title independently in the canonical scene", () => {
    let p = defaultProject();
    const titleY = p.titleBox.y;
    p = updateView(p, { yearBox: { ...p.yearBox!, x: 20, y: 40 } });
    const scene = buildScene(p);
    expect(p.titleBox.y).toBe(titleY);
    const year = scene.nodes.find(
      (n) => n.kind === "text" && n.text === String(p.year),
    );
    expect(!!year).toBe(true);
    expect(year!.y > 40).toBe(true);
  });
  it("positions day numbers and namedays independently inside cells", () => {
    const p = { ...defaultProject(), year: 2027, month: 3 };
    const first = buildScene(p);
    const cell = first.cells.find(
      (c) => c.date.month === 3 && c.date.day === 1,
    )!;
    const within = (scene: ReturnType<typeof buildScene>, category: string) =>
      scene.nodes.find(
        (n) =>
          n.kind === "text" &&
          n.clip &&
          n.x >= cell.x &&
          n.x < cell.x + cell.w &&
          n.y > cell.y &&
          n.y < cell.y + cell.h &&
          (category === "date" ? n.text === "1" : n.text.includes("Albin")),
      )!;
    const before = within(first, "date");
    p.style.typography.date.vertical = "middle";
    p.style.typography.nameday.vertical = "bottom";
    const scene = buildScene(p);
    expect(within(scene, "date").y > before.y + 2).toBe(true);
    expect(within(scene, "nameday").y > within(scene, "date").y).toBe(true);
    expect(scene.issues.some((i) => i.code === "overflow")).toBe(false);
    expect(
      parseProject(serializeProject(p)).style.typography.nameday.vertical,
    ).toBe("bottom");
  });
  it("anchors personal events from the cell bottom upwards", () => {
    const p = { ...defaultProject(), year: 2027, month: 3 };
    p.events = [
      {
        id: "a",
        kind: "birthday",
        name: "Anna",
        month: 3,
        day: 1,
        birthYear: null,
        showAge: false,
        hidden: false,
      },
      {
        id: "b",
        kind: "nameday",
        name: "Réka",
        month: 3,
        day: 1,
        birthYear: null,
        showAge: false,
        hidden: false,
      },
    ];
    const scene = buildScene(p),
      cell = scene.cells.find((c) => c.date.day === 1)!;
    const a = scene.nodes.find((n) => n.kind === "text" && n.text === "Anna")!,
      b = scene.nodes.find((n) => n.kind === "text" && n.text === "Réka")!;
    expect(a.y > b.y).toBe(true);
    expect(b.y > cell.y + cell.h * 0.5).toBe(true);
    expect(a.y < cell.y + cell.h).toBe(true);
  });
  it("retains point sizes when toggling A4 orientation", () => {
    const p = defaultProject(),
      q = applyPaper(applyPaper(p, "A4", "landscape"), "A4", "portrait");
    expect(q.style.typography).toEqual(p.style.typography);
  });
  it("includes every requested Google Fonts family with actual Hungarian glyphs and available styles", () => {
    const requested = [
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
    ];
    for (const family of requested) {
      const records = manifest.filter((f) => f.family === family);
      expect(records.length > 0).toBe(true);
      for (const f of records) {
        const font = getFont({
          family: f.family as any,
          weight: f.weight as 400 | 700,
          italic: "italic" in f && f.italic,
        }).font;
        for (const c of "áéíóöőúüűÁÉÍÓÖŐÚÜŰ")
          expect(font.hasGlyphForCodePoint(c.codePointAt(0)!)).toBe(true);
      }
    }
    expect(fontVariants("Inter")).toHaveLength(4);
    expect(fontVariants("Abril Fatface")).toHaveLength(1);
    expect(
      validTypography({
        ...defaultProject().style.typography.title,
        family: "Abril Fatface",
        weight: 700,
        italic: true,
      }).weight,
    ).toBe(400);
  });
});

it("migrates a legacy combined title/year box without shifting its printed text", () => {
  const old: any = defaultProject();
  delete old.cover;
  delete old.yearBox;
  old.titleBox = { x: 12, y: 16, w: 186, h: 26, locked: false };
  delete old.style.typography.title;
  old.style.typography.month.family = "Montserrat";
  const p = parseProject(JSON.stringify(old));
  expect(p.yearBox!.y).toBe(16);
  expect(p.titleBox.y).toBe(24);
  expect(p.style.typography.title.family).toBe("Montserrat");
});
