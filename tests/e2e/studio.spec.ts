import { test, expect } from "@playwright/test";

test("A4 JPG has actual print pixels and 300 DPI density", async ({ page }) => {
  await page.getByRole("button", { name: "Exportálás", exact: true }).click();
  await page.getByRole("button", { name: /JPG Fotóbarát/ }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Letöltés", exact: true }).click();
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
  const warnings = page.getByLabel("Átnéztem a figyelmeztetéseket");
  if (await warnings.count()) await warnings.check();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Letöltés", exact: true }).click();
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
  const accept = page.getByLabel("Átnéztem a figyelmeztetéseket");
  if (await accept.count()) await accept.check();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Letöltés", exact: true }).click();
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
  await page.getByRole("button", { name: "Képek", exact: true }).click();
  await page
    .locator("input[type=file]")
    .nth(2)
    .setInputFiles("tests/fixtures/foto.png");
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
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Projekt mentése", exact: true })
    .click();
  const path = await (await pending).path();
  await page.getByRole("button", { name: "Új", exact: true }).click();
  await page.locator("input[type=file]").nth(0).setInputFiles(path!);
  await page.getByRole("button", { name: /foto.png 1200/ }).click();
  await expect(
    page.getByRole("slider", { name: "Kép mérete a maszkban", exact: true }),
  ).toHaveValue("1.5");
  await expect(page.getByLabel("Maszk alakja")).toHaveValue("ellipse");
  await expect(page.getByTestId("calendar-paper").locator("image")).toHaveCount(
    1,
  );
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
  await page.getByRole("button", { name: "Letöltés", exact: true }).click();
  const fs = await import("node:fs/promises");
  const data = await fs.readFile((await (await pending).path())!);
  expect(data.readUInt32BE(16)).toBe(2480);
  expect(data.readUInt32BE(20)).toBe(3508);
});
