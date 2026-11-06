import { test, expect } from "@playwright/test";

test("A4 JPG has actual print pixels and 300 DPI density", async ({ page }) => {
  await page.getByRole("button", { name: "Exportálás", exact: true }).click();
  await page.getByRole("button", { name: /JPG Fotóbarát/ }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: /^(Letöltés|Figyelmeztetések figyelmen kívül hagyása és letöltés)$/i,
    })
    .click();
  const fs = await import("node:fs/promises");
  const data = await fs.readFile((await (await pending).path())!);
  const jfif = data.indexOf(Buffer.from("JFIF\0"));
  expect(jfif).toBeGreaterThan(0);
  expect(data[jfif + 7]).toBe(1);
  expect(data.readUInt16BE(jfif + 8)).toBe(300);
  expect(data.readUInt16BE(jfif + 10)).toBe(300);
  let dimensions: [number, number] | undefined;
  for (let i = 2; i < data.length - 9;) {
    if (data[i] !== 255) break;
    const marker = data[i + 1];
    if ([192, 193, 194].includes(marker)) {
      dimensions = [data.readUInt16BE(i + 7), data.readUInt16BE(i + 5)];
      break;
    }
    i += 2 + data.readUInt16BE(i + 2);
  }
  expect(dimensions).toEqual([2480, 3508]);
});
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("calendar-paper")).toBeVisible();
  await page.getByRole("button", { name: "Március", exact: true }).click();
  await page.getByLabel("Év", { exact: true }).fill("2027");
});
test("birthday entry, project save/load and undo/redo", async ({ page }) => {
  await page
    .getByRole("button", {
      name: "2027. 3. 1. – események szerkesztése",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Új esemény ezen a napon" }).click();
  await page.getByLabel("Keresztnév", { exact: true }).fill("Anna");
  await page.getByLabel("Születési év (nem kötelező)").fill("2000");
  await page.getByRole("button", { name: "Esemény mentése" }).click();
  await page.getByRole("button", { name: "Kész", exact: true }).click();
  await expect(
    page.getByTestId("calendar-paper").getByText("Anna (27)", { exact: true }),
  ).toBeVisible();
  const saved = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Projekt mentése", exact: true })
    .click();
  const download = await saved;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.getByRole("button", { name: "Visszavonás", exact: true }).click();
  await expect(
    page.getByTestId("calendar-paper").getByText("Anna (27)", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Újra", exact: true }).click();
  await expect(
    page.getByTestId("calendar-paper").getByText("Anna (27)", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Új", exact: true }).click();
  await page.locator("input[type=file]").nth(0).setInputFiles(path!);
  await expect(
    page.getByTestId("calendar-paper").getByText("Anna (27)", { exact: true }),
  ).toBeVisible();
});
test("personal nameday, editing and deletion", async ({ page }) => {
  await page
    .getByRole("button", {
      name: "2027. 3. 2. – események szerkesztése",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Új esemény ezen a napon" }).click();
  await page.getByLabel("Eseménytípus").selectOption("nameday");
  await page.getByLabel("Keresztnév", { exact: true }).fill("Réka");
  await page.getByRole("button", { name: "Esemény mentése" }).click();
  await page.getByRole("button", { name: "Réka szerkesztése" }).click();
  await page.getByLabel("Keresztnév", { exact: true }).fill("Ágnes");
  await page.getByRole("button", { name: "Esemény mentése" }).click();
  await expect(
    page.getByRole("button", { name: "Ágnes törlése" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ágnes törlése" }).click();
  await expect(page.getByRole("button", { name: "Ágnes törlése" })).toHaveCount(
    0,
  );
});
test("annual A4 landscape layout and PDF download", async ({ page }) => {
  await page.getByRole("button", { name: "Borító", exact: true }).click();
  await page.getByRole("button", { name: "Fekvő", exact: true }).click();
  const paper = page.getByTestId("calendar-paper");
  await expect(paper.getByText("Január", { exact: true })).toBeVisible();
  await expect(paper.getByText("December", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Exportálás", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: /^(Letöltés|Figyelmeztetések figyelmen kívül hagyása és letöltés)$/i,
    })
    .click();
  expect((await pending).suggestedFilename()).toBe("naptar-2027.pdf");
});
test("recovery is offered after reload", async ({ page }) => {
  await page.clock.install();
  await page.getByLabel("Projekt neve").fill("Helyreállítás próba");
  await page.clock.fastForward(1500);
  await expect(
    page.getByText("Helyi helyreállítás mentve", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("dialog", { name: "Megőriztük a legutóbbi munkádat" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Munka helyreállítása" }).click();
  await expect(page.getByLabel("Projekt neve")).toHaveValue(
    "Helyreállítás próba",
  );
});
test("monthly full-year PNG export contains 12 files", async ({ page }) => {
  await page.getByRole("button", { name: "Exportálás", exact: true }).click();
  await page.getByRole("button", { name: /PNG Veszteségmentes/ }).click();
  await page.getByLabel("Exportált oldalak").selectOption("all");
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: /^(Letöltés|Figyelmeztetések figyelmen kívül hagyása és letöltés)$/i,
    })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("naptar-2027.zip");
  const JSZip = (await import("jszip")).default;
  const fs = await import("node:fs/promises");
  const zip = await JSZip.loadAsync(
    await fs.readFile((await download.path())!),
  );
  expect(Object.keys(zip.files)).toHaveLength(12);
});
test("representative editor screenshot", async ({ page }) => {
  await page.screenshot({
    path: `test-results/editor-${test.info().project.name}.png`,
    fullPage: true,
  });
  await expect(
    page.getByRole("img", { name: "Havi naptár előnézete" }),
  ).toBeVisible();
});
test("photograph crop settings survive a portable project round trip", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Képhelyek", exact: true }).click();
  await page.getByRole("button", { name: "Új képhely", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Kép betöltése", exact: true })
    .click();
  await (await chooser).setFiles("tests/fixtures/foto.png");
  await expect(
    page.getByRole("slider", { name: "Kép mérete a maszkban", exact: true }),
  ).toBeVisible();
  const zoom = page.getByRole("slider", {
    name: "Kép mérete a maszkban",
    exact: true,
  });
  await zoom.press("Home");
  for (let i = 0; i < 10; i++) await zoom.press("ArrowRight");
  await page.getByLabel("Maszk alakja").selectOption("ellipse");
  const border = page.getByRole("slider", {
    name: "Maszk keret vastagsága",
    exact: true,
  });
  await border.press("Home");
  for (let i = 0; i < 5; i++) await border.press("ArrowRight");
  await page
    .getByRole("slider", { name: "Telítettség", exact: true })
    .press("Home");
  await page
    .getByLabel("Keret stílusa", { exact: true })
    .selectOption("dashed");
  await page.getByLabel("Vetett árnyék", { exact: true }).check();
  await page.getByLabel("Képszél elmosása", { exact: true }).check();
  await page.getByLabel("Tükröződés", { exact: true }).check();
  await page.getByRole("button", { name: "Feljebb", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Projekt mentése", exact: true })
    .click();
  const path = await (await pending).path();
  await page.getByRole("button", { name: "Új", exact: true }).click();
  await page.locator("input[type=file]").nth(0).setInputFiles(path!);
  await page
    .locator(".photo-layer")
    .getByRole("button", { name: "Képhely 1", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Kép mérete a maszkban", exact: true }),
  ).toHaveValue("1.5");
  await expect(page.getByLabel("Maszk alakja")).toHaveValue("ellipse");
  await expect(page.getByTestId("calendar-paper").locator("image")).toHaveCount(
    1,
  );
  await expect(
    page.getByRole("slider", { name: "Telítettség", exact: true }),
  ).toHaveValue("-100");
  await page.getByRole("button", { name: "Exportálás", exact: true }).click();
  await page.getByRole("button", { name: /PNG Veszteségmentes/ }).click();
  const pngDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /letöltés$/i }).click();
  const { PNG } = await import("pngjs");
  const { readFile } = await import("node:fs/promises");
  const png = PNG.sync.read(
    await readFile((await (await pngDownload).path())!),
  );
  const i = (550 * png.width + 1240) * 4;
  const [r, g, b] = png.data.subarray(i, i + 3);
  expect(r).toBeLessThan(250);
  expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(2);
  const reflected = (1050 * png.width + 1240) * 4;
  expect(png.data[reflected]).toBeLessThan(252);
});
test("preview zoom does not change exported PNG dimensions", async ({
  page,
}) => {
  await page
    .getByRole("slider", { name: "Nagyítás", exact: true })
    .press("End");
  await page.getByRole("button", { name: "Exportálás", exact: true }).click();
  await page.getByRole("button", { name: /PNG Veszteségmentes/ }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: /^(Letöltés|Figyelmeztetések figyelmen kívül hagyása és letöltés)$/i,
    })
    .click();
  const fs = await import("node:fs/promises");
  const data = await fs.readFile((await (await pending).path())!);
  expect(data.readUInt32BE(16)).toBe(2480);
  expect(data.readUInt32BE(20)).toBe(3508);
});

test("weekday header appearance, click selection and effects export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page
    .getByRole("button", { name: "Hétfejléc kiválasztása", exact: true })
    .click();
  await expect(page.getByLabel("Elem", { exact: true })).toHaveValue("header");
  await page.getByLabel("Betűtípus", { exact: true }).selectOption("Lato");
  await page
    .getByLabel("Szöveg igazítása", { exact: true })
    .selectOption("right");
  await page.getByLabel("Elem háttérszíne", { exact: true }).check();
  await page.getByLabel("Háttérszín", { exact: true }).fill("#abc123");
  for (const name of [
    "Befoglaló bővítése vízszintesen",
    "Befoglaló bővítése függőlegesen",
    "Háttér sarkainak lekerekítése",
  ]) {
    const slider = page.getByRole("slider", { name, exact: true });
    for (let i = 0; i < 10; i++) await slider.press("ArrowRight");
    await expect(slider).toHaveValue("1");
  }
  const { PNG } = await import("pngjs");
  const headerArtwork = page.getByTestId("calendar-paper").locator("image");
  const href = await headerArtwork.getAttribute("href");
  const preview = PNG.sync.read(Buffer.from(href!.split(",")[1], "base64"));
  expect(preview.data[3]).toBe(0);
  const insetPixel = (3 * preview.width + 3) * 4;
  expect([...preview.data.subarray(insetPixel, insetPixel + 4)]).toEqual([
    171, 193, 35, 255,
  ]);
  await page.getByLabel("Vetett árnyék", { exact: true }).check();
  await page.getByLabel("Tükröződés", { exact: true }).check();
  await expect(page.getByTestId("calendar-paper").locator("image")).toHaveCount(
    1,
  );
  await page
    .getByRole("button", { name: "Cím kiválasztása", exact: true })
    .click();
  await expect(page.getByLabel("Elem", { exact: true })).toHaveValue("title");
  await page.getByLabel("Vetett árnyék", { exact: true }).check();
  await expect(page.getByTestId("calendar-paper").locator("image")).toHaveCount(
    2,
  );
  await page.getByRole("button", { name: "Exportálás", exact: true }).click();
  await page.getByRole("button", { name: /PNG/ }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: /^(Letöltés|Figyelmeztetések figyelmen kívül hagyása és letöltés)$/i,
    })
    .click();
  const fs = await import("node:fs/promises");
  const data = await fs.readFile((await (await pending).path())!);
  expect([...data.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(data.readUInt32BE(16)).toBe(2480);
  await page.getByRole("button", { name: "Exportálás", exact: true }).click();
  await page.getByRole("button", { name: /PDF/ }).click();
  const pdfDownload = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: /^(Letöltés|Figyelmeztetések figyelmen kívül hagyása és letöltés)$/i,
    })
    .click();
  const pdf = await fs.readFile((await (await pdfDownload).path())!);
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  expect(errors).toEqual([]);
});

test("mask duplication keeps dimensions and linked styles can be detached", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Képhelyek", exact: true }).click();
  await page.getByRole("button", { name: "Új képhely", exact: true }).click();
  await page
    .getByRole("slider", { name: "Maszk keret vastagsága", exact: true })
    .press("ArrowRight");
  await page
    .getByRole("button", { name: "Képhely 1 másolása", exact: true })
    .click();
  await expect(page.locator(".photo-layer")).toHaveCount(2);
  const second = page.locator(".photo-layer").nth(1);
  await expect(
    second.getByLabel("Azonos stílus", { exact: true }),
  ).toBeChecked();
  await second.getByLabel("Azonos stílus", { exact: true }).uncheck();
  await page
    .getByRole("slider", { name: "Maszk keret vastagsága", exact: true })
    .press("ArrowRight");
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Projekt mentése", exact: true })
    .click();
  const fs = await import("node:fs/promises");
  const saved = JSON.parse(
    await fs.readFile((await (await pending).path())!, "utf8"),
  );
  expect(saved.photos[1].box).toEqual(saved.photos[0].box);
  expect(saved.photos[1].data).toBe("");
  expect(saved.photos[1].border).toBeGreaterThan(saved.photos[0].border);
  await second.getByLabel("Azonos stílus", { exact: true }).check();
  await second
    .getByRole("button", { name: "Stílus törlése", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Maszk keret vastagsága", exact: true }),
  ).toHaveValue("0");
});
