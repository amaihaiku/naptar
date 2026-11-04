import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function savedProject(page: Page) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Projekt mentése", exact: true })
    .click();
  return JSON.parse(await readFile((await (await pending).path())!, "utf8"));
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("calendar-paper")).toBeVisible();
});
test("thirteen page icons and exclusive guide/print mode", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Naptároldalak" });
  await expect(nav.getByRole("button")).toHaveCount(13);
  await page
    .getByRole("button", { name: "Nyomtatási nézet", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Nyomtatási nézet", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Segédvonalak", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Segédvonalak", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Nyomtatási nézet", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await nav.getByRole("button", { name: "Augusztus", exact: true }).click();
  await expect(
    page.getByTestId("calendar-paper").getByText("Augusztus", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Havi", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Papírméret", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Haladó", { exact: true })).toHaveCount(0);
});
test("current year, year arrows, A4 orientation and margin slider", async ({
  page,
}) => {
  const current = Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "Europe/Budapest",
      year: "numeric",
    }).format(new Date()),
  );
  await expect(page.getByLabel("Év", { exact: true })).toHaveValue(
    String(current),
  );
  await page.getByRole("button", { name: "Következő év", exact: true }).click();
  await expect(page.getByLabel("Év", { exact: true })).toHaveValue(
    String(current + 1),
  );
  await page.getByRole("button", { name: "Előző év", exact: true }).click();
  await page
    .getByRole("slider", { name: "Vízszintes margó", exact: true })
    .press("End");
  await expect(
    page.getByRole("slider", { name: "Vízszintes margó", exact: true }),
  ).toHaveValue("20");
  await page.getByRole("button", { name: "Fekvő", exact: true }).click();
  const p = await savedProject(page);
  expect(p.page.size).toBe("A4");
  expect([p.page.width, p.page.height]).toEqual([297, 210]);
});
test("cover calendar toggle and distinct year/title fields", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Borító", exact: true }).click();
  await page.getByLabel("Naptár megjelenítése a borítón").uncheck();
  const paper = page.getByTestId("calendar-paper");
  await expect(paper.getByText("Január", { exact: true })).toHaveCount(0);
  await expect(
    paper.getByText(String(new Date().getFullYear()), { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Cím szövege").fill("Családi naptár");
  await page.getByRole("button", { name: "Cím jobbra", exact: true }).click();
  await page.getByLabel("Elem", { exact: true }).selectOption("year");
  await page.getByRole("button", { name: "Évszám balra", exact: true }).click();
  const p = await savedProject(page);
  expect(p.cover.title).toBe("Családi naptár");
  expect(p.cover.style.typography.title.align).toBe("right");
  expect(p.cover.style.typography.year.align).toBe("left");
});
test("monthly formatting remains identical across all twelve pages and cover remains independent", async ({
  page,
}) => {
  await page.getByLabel("Betűméret", { exact: true }).fill("29");
  await page
    .getByRole("navigation", { name: "Naptároldalak" })
    .getByRole("button", { name: "December", exact: true })
    .click();
  await expect(page.getByLabel("Betűméret", { exact: true })).toHaveValue("29");
  await page.getByRole("button", { name: "Borító", exact: true }).click();
  await expect(page.getByLabel("Betűméret", { exact: true })).toHaveValue("32");
  await page
    .getByRole("navigation", { name: "Naptároldalak" })
    .getByRole("button", { name: "Január", exact: true })
    .click();
  await expect(page.getByLabel("Betűméret", { exact: true })).toHaveValue("29");
  await page.getByLabel("Elem", { exact: true }).selectOption("grid");
  await expect(page.getByLabel("X pozíció", { exact: true })).toHaveCount(0);
});
test("day and nameday cell positions are independently shared across months", async ({
  page,
}) => {
  await page.getByLabel("Szövegelem", { exact: true }).selectOption("date");
  await page
    .getByLabel("Nap elhelyezése", { exact: true })
    .selectOption("right");
  await page.getByLabel("Nap függőleges elhelyezése").selectOption("middle");
  await page.getByLabel("Szövegelem", { exact: true }).selectOption("nameday");
  await page
    .getByLabel("Névnapok függőleges elhelyezése")
    .selectOption("bottom");
  await page
    .getByRole("navigation", { name: "Naptároldalak" })
    .getByRole("button", { name: "December", exact: true })
    .click();
  await page.getByLabel("Szövegelem", { exact: true }).selectOption("nameday");
  await expect(page.getByLabel("Névnapok függőleges elhelyezése")).toHaveValue(
    "bottom",
  );
  const p = await savedProject(page);
  expect(p.style.typography.date.align).toBe("right");
  expect(p.style.typography.date.vertical).toBe("middle");
  expect(p.style.typography.nameday.vertical).toBe("bottom");
});
test("font style variants are real, local and independently selectable", async ({
  page,
}) => {
  await page.getByLabel("Betűtípus", { exact: true }).selectOption("Lora");
  await page.getByLabel("Típus", { exact: true }).selectOption("700-italic");
  await page.getByLabel("Elem", { exact: true }).selectOption("year");
  await expect(page.getByLabel("Típus", { exact: true })).toHaveValue(
    "700-normal",
  );
  await page
    .getByLabel("Betűtípus", { exact: true })
    .selectOption("Abril Fatface");
  await expect(
    page.getByLabel("Típus", { exact: true }).getByRole("option"),
  ).toHaveCount(1);
  const p = await savedProject(page);
  expect(p.style.typography.title.family).toBe("Lora");
  expect(p.style.typography.title.italic).toBe(true);
  expect(p.style.typography.year.family).toBe("Abril Fatface");
});
test("photo mask freely resizes and its image can be panned within it", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Képhelyek", exact: true }).click();
  await page.getByRole("button", { name: "Új képhely", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Kép betöltése", exact: true })
    .click();
  await (await chooser).setFiles("tests/fixtures/foto.png");
  const zoom = page.getByRole("slider", {
    name: "Kép mérete a maszkban",
    exact: true,
  });
  await zoom.press("Home");
  for (let i = 0; i < 20; i++) await zoom.press("ArrowRight");
  const before = await savedProject(page);
  const handle = await page
    .getByRole("button", { name: "Kijelölt elem átméretezése", exact: true })
    .boundingBox();
  expect(handle).toBeTruthy();
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    handle!.y + handle!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handle!.x + 80, handle!.y + 25, { steps: 8 });
  await page.mouse.up();
  const after = await savedProject(page);
  expect(after.photos[0].box.w).toBeGreaterThan(before.photos[0].box.w);
  expect(after.photos[0].box.w / after.photos[0].box.h).not.toBeCloseTo(
    before.photos[0].box.w / before.photos[0].box.h,
    2,
  );
  await page
    .getByRole("button", { name: "Tükrözés vízszintesen", exact: true })
    .click();
  const photo = page.getByTestId("calendar-paper").locator("image");
  const initialX = Number(await photo.getAttribute("x"));
  const hit = await page
    .getByRole("button", {
      name: "foto.png kiválasztása és mozgatása a maszkban",
    })
    .boundingBox();
  await page.mouse.move(hit!.x + hit!.width / 2, hit!.y + hit!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    hit!.x + hit!.width / 2 + 25,
    hit!.y + hit!.height / 2 + 15,
    { steps: 8 },
  );
  await page.mouse.up();
  expect(Number(await photo.getAttribute("x"))).toBeGreaterThan(initialX);
  const cropped = await savedProject(page);
  expect(
    Math.abs(cropped.photos[0].panX) + Math.abs(cropped.photos[0].panY),
  ).toBeGreaterThan(0);
  await expect(page.getByLabel("X pozíció", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Árnyék mérete", { exact: true })).toHaveCount(0);
});

test("title and year can be dragged independently by their own text areas", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Borító", exact: true }).click();
  const before = await savedProject(page);
  async function drag(label: string, dx: number, dy: number) {
    const b = await page
      .getByRole("button", { name: label, exact: true })
      .boundingBox();
    expect(b).toBeTruthy();
    await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2);
    await page.mouse.down();
    await page.mouse.move(b!.x + b!.width / 2 + dx, b!.y + b!.height / 2 + dy, {
      steps: 8,
    });
    await page.mouse.up();
  }
  await drag("Cím kiválasztása", 40, 15);
  const title = await savedProject(page);
  expect(title.cover.titleBox.x).not.toBe(before.cover.titleBox.x);
  expect(title.cover.yearBox).toEqual(before.cover.yearBox);
  await drag("Évszám kiválasztása", 20, 25);
  const year = await savedProject(page);
  expect(year.cover.yearBox.y).not.toBe(title.cover.yearBox.y);
  expect(year.cover.titleBox).toEqual(title.cover.titleBox);
});

test("a shared slot keeps its mask and stores independently edited photos per month", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Képhelyek", exact: true }).click();
  await page.getByRole("button", { name: "Új képhely", exact: true }).click();
  await page.getByLabel("Minden hónapban", { exact: true }).check();
  async function upload() {
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Kép betöltése", exact: true })
      .click();
    await (await chooser).setFiles("tests/fixtures/foto.png");
    await expect(
      page.getByRole("button", { name: "Képcsere", exact: true }),
    ).toBeVisible();
  }
  await upload();
  await page
    .getByRole("button", { name: "Tükrözés vízszintesen", exact: true })
    .click();
  await page
    .getByRole("slider", { name: "Fényerő", exact: true })
    .press("ArrowRight");
  await page
    .getByRole("navigation", { name: "Naptároldalak" })
    .getByRole("button", { name: "Április", exact: true })
    .click();
  await page
    .locator(".photo-layer")
    .getByRole("button", { name: "Képhely 1", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Kép betöltése", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Képcsere", exact: true }),
  ).toHaveCount(0);
  await upload();
  const slotMonths = page.getByRole("group", { name: "Képhely 1 hónapjai" });
  await slotMonths
    .getByRole("button", { name: "Április", exact: true })
    .click();
  await expect(
    page.getByLabel("Minden hónapban", { exact: true }),
  ).not.toBeChecked();
  await expect(
    slotMonths.getByRole("button", { name: "Április", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const project = await savedProject(page);
  expect(project.photos).toHaveLength(1);
  expect(project.photos[0].monthlyImages["3"].edits).toEqual({
    flipX: true,
    brightness: 1,
  });
  expect(project.photos[0].monthlyImages["4"].edits).toBeUndefined();

  await page.getByRole("button", { name: "Stílus", exact: true }).click();
  await page.getByLabel("Sablon neve", { exact: true }).fill("Nyári sablon");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Sablon mentése", exact: true })
    .click();
  const path = (await (await download).path())!;
  const template = JSON.parse(await readFile(path, "utf8"));
  expect(template.name).toBe("Nyári sablon");
  expect(template.photos[0].box).toEqual(project.photos[0].box);
  expect(template.photos[0].data).toBe("");
  expect(template.photos[0].monthlyImages).toBeUndefined();
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles({
      name: "sablon.json",
      mimeType: "application/json",
      buffer: await readFile(path),
    });
  await expect(page.locator(".loaded-template")).toContainText("Nyári sablon");
});

test("an out-of-page title can be exported with the cover and all months", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Borító", exact: true }).click();
  await page.getByLabel("X pozíció", { exact: true }).fill("-150");
  await page.getByRole("button", { name: "Exportálás", exact: true }).click();
  await page.getByLabel("Exportált oldalak").selectOption("cover-all");
  await expect(
    page
      .getByRole("dialog")
      .getByText("Cím: az elem kilóg a lapból.", { exact: true }),
  ).toBeVisible();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: /Figyelmeztetések figyelmen kívül hagyása és letöltés/,
    })
    .click();
  const file = await (await pending).path();
  const { PDFDocument } = await import("pdf-lib");
  expect((await PDFDocument.load(await readFile(file!))).getPageCount()).toBe(
    13,
  );
});

test("custom text uses the live geometry fields and stays on its page", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Szöveg hozzáadása", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Szöveg", exact: true })
    .fill("Közös emlékek");
  await page
    .getByRole("spinbutton", { name: "Aktív elem: X", exact: true })
    .fill("32.5");
  await page
    .getByRole("spinbutton", { name: "Aktív elem: Szélesség", exact: true })
    .fill("85");
  await expect(
    page
      .getByTestId("calendar-paper")
      .getByText("Közös emlékek", { exact: true }),
  ).toBeVisible();
  const p = await savedProject(page);
  expect(p.textElements[0].box).toMatchObject({ x: 32.5, w: 85 });
  await page
    .getByRole("navigation", { name: "Naptároldalak" })
    .getByRole("button", { name: "Április", exact: true })
    .click();
  await expect(
    page
      .getByTestId("calendar-paper")
      .getByText("Közös emlékek", { exact: true }),
  ).toHaveCount(0);
});
