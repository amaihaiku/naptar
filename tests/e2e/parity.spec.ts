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
  await page
    .getByRole("button", {
      name: /^(Letöltés|Figyelmeztetések figyelmen kívül hagyása és letöltés)$/i,
    })
    .click();
  const path = await (await pending).path();
  const exported = await readFile(path!);
  await writeFile(
    `test-results/full-300dpi-${test.info().project.name}.png`,
    exported,
  );
  const full = PNG.sync.read(exported);
  const actual = areaDownsample(full, expected.width, expected.height);
  const actualBytes = PNG.sync.write(actual);
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

// Use the same area integration for every engine. Firefox's low-quality Canvas
// drawImage downsampling samples too few source pixels and creates false missing
// strokes when shrinking a 300 DPI image to a small editor screenshot.
function areaDownsample(source: PNG, width: number, height: number): PNG {
  const target = new PNG({ width, height });
  const sx = source.width / width,
    sy = source.height / height;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const left = x * sx,
        right = (x + 1) * sx,
        top = y * sy,
        bottom = (y + 1) * sy;
      const sum = [0, 0, 0];
      for (
        let iy = Math.floor(top);
        iy < Math.ceil(bottom) && iy < source.height;
        iy++
      ) {
        const wy = Math.min(iy + 1, bottom) - Math.max(iy, top);
        for (
          let ix = Math.floor(left);
          ix < Math.ceil(right) && ix < source.width;
          ix++
        ) {
          const weight = wy * (Math.min(ix + 1, right) - Math.max(ix, left));
          const index = (iy * source.width + ix) * 4;
          for (let c = 0; c < 3; c++) sum[c] += source.data[index + c] * weight;
        }
      }
      const index = (y * width + x) * 4;
      for (let c = 0; c < 3; c++)
        target.data[index + c] = Math.round(sum[c] / (sx * sy));
      target.data[index + 3] = 255;
    }
  return target;
}
