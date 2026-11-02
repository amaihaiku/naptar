import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import { readFile, writeFile } from "node:fs/promises";

test("SVG preview and 300 DPI PNG preserve the same visible geometry", async ({
  page,
}) => {
  await page.goto("/");
  const paper = page.getByTestId("calendar-paper");
  await expect(paper).toBeVisible();
  await page
    .getByRole("button", { name: "Nyomtatási nézet", exact: true })
    .click();
  const preview = await paper.screenshot();
  const expected = PNG.sync.read(preview);
  await page.getByRole("button", { name: "Exportálás", exact: true }).click();
  await page.getByRole("button", { name: /PNG Veszteségmentes/ }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Letöltés", exact: true }).click();
  const path = await (await pending).path();
  const exported = await readFile(path!);
  const comparable = await page.evaluate(
    async ({ source, width, height }) => {
      const image = new window.Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL("image/png");
    },
    {
      source: "data:image/png;base64," + exported.toString("base64"),
      width: expected.width,
      height: expected.height,
    },
  );
  const actualBytes = Buffer.from(comparable.split(",")[1], "base64");
  const actual = PNG.sync.read(actualBytes);
  // Compare visible ink with one screen-pixel antialiasing tolerance. Missing text
  // and displaced lines fail, while browser-specific font edge shading may differ.
  const mask = (png: PNG) =>
    Uint8Array.from({ length: png.width * png.height }, (_, i) =>
      Math.min(png.data[i * 4], png.data[i * 4 + 1], png.data[i * 4 + 2]) < 180
        ? 1
        : 0,
    );
  const a = mask(actual),
    b = mask(expected),
    w = actual.width,
    h = actual.height;
  function unmatched(source: Uint8Array, target: Uint8Array) {
    let ink = 0,
      missed = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!source[y * w + x]) continue;
        ink++;
        let matched = false;
        for (let dy = -1; dy <= 1 && !matched; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (
              y + dy >= 0 &&
              y + dy < h &&
              x + dx >= 0 &&
              x + dx < w &&
              target[(y + dy) * w + x + dx]
            ) {
              matched = true;
              break;
            }
          }
        if (!matched) missed++;
      }
    return missed / Math.max(1, ink);
  }
  await writeFile(
    `test-results/preview-${test.info().project.name}.png`,
    preview,
  );
  await writeFile(
    `test-results/export-${test.info().project.name}.png`,
    actualBytes,
  );
  expect(unmatched(a, b)).toBeLessThan(0.08);
  expect(unmatched(b, a)).toBeLessThan(0.08);
});
