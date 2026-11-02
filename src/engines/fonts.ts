import fontkit from "@pdf-lib/fontkit";
import manifest from "../data/fonts.json";
import type { Typography } from "../model";
export interface Font {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  glyphForCodePoint(cp: number): { advanceWidth: number };
  hasGlyphForCodePoint(cp: number): boolean;
}
export interface LoadedFont {
  data: Uint8Array;
  font: Font;
}
const cache = new Map<string, LoadedFont>();
export const fontKey = (t: Pick<Typography, "family" | "weight">) =>
  `${t.family}-${t.weight}`;
export const mmPerPt = 25.4 / 72;
export async function loadFonts(): Promise<void> {
  await Promise.all(
    manifest.map(async (f) => {
      const key = `${f.family}-${f.weight}`;
      if (cache.has(key)) return;
      const response = await fetch(
        import.meta.env.BASE_URL + "fonts/" + f.file,
      );
      if (!response.ok) throw new Error("Nem tölthető be a betű: " + f.family);
      const data = new Uint8Array(await response.arrayBuffer());
      const font = fontkit.create(data) as Font;
      for (const c of "áéíóöőúüűÁÉÍÓÖŐÚÜŰ")
        if (!font.hasGlyphForCodePoint(c.codePointAt(0)!))
          throw new Error("Hiányos magyar karakterkészlet: " + f.family);
      const face = new FontFace(f.family, data, { weight: String(f.weight) });
      await face.load();
      document.fonts.add(face);
      cache.set(key, { data, font });
    }),
  );
  await document.fonts.ready;
}
export function registerFont(key: string, data: Uint8Array) {
  cache.set(key, { data, font: fontkit.create(data) as Font });
}
export function getFont(t: Pick<Typography, "family" | "weight">): LoadedFont {
  const f = cache.get(fontKey(t));
  if (!f) throw new Error("A betűk még nem állnak készen.");
  return f;
}
export function advance(c: string, t: Typography): number {
  const f = getFont(t).font;
  return (
    (f.glyphForCodePoint(c.codePointAt(0)!).advanceWidth / f.unitsPerEm) *
    t.size *
    mmPerPt
  );
}
export function textWidth(text: string, t: Typography): number {
  const chars = Array.from(text);
  return (
    chars.reduce((v, c) => v + advance(c, t), 0) +
    Math.max(0, chars.length - 1) * t.spacing
  );
}
export function wrap(text: string, t: Typography, max: number): string[] {
  if (!text) return [];
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (line && textWidth(line + " " + word, t) > max) {
        lines.push(line);
        line = "";
      }
      if (textWidth(word, t) > max) {
        for (const ch of word) {
          if (line && textWidth(line + ch, t) > max) {
            lines.push(line);
            line = "";
          }
          line += ch;
        }
      } else line += (line ? " " : "") + word;
    }
    if (line) lines.push(line);
  }
  return lines;
}
export function baseline(t: Typography): number {
  const f = getFont(t).font;
  return (f.ascent / f.unitsPerEm) * t.size * mmPerPt;
}
export function missingGlyphs(text: string, t: Typography): string[] {
  const f = getFont(t).font;
  return [
    ...new Set(
      Array.from(text).filter(
        (c) => !f.hasGlyphForCodePoint(c.codePointAt(0)!),
      ),
    ),
  ];
}
