import { leap } from "./date";
import leapRecords from "../data/namedays-leap.json";
import raw from "../data/namedays.json";
type Records = Record<
  string,
  Record<string, { main: string[]; other: string[] }>
>;
export const namedaySource = {
  url: "https://github.com/froccsos/nevnapok-json",
  sha: "93f8865c4aa94764b1d8fe1f413382d11850d073",
  license: "MIT",
  original: "https://mek.oszk.hu/00000/00056/html/196.htm",
};
export function namedays(
  m: number,
  d: number,
  overrides: Record<string, string[]> = {},
  year = 2001,
): string[] {
  const key = `${m}-${d}`;
  if (Object.hasOwn(overrides, key)) return overrides[key].slice(0, 2);
  const entry =
    m === 2 && leap(year) && d >= 24
      ? (leapRecords as Record<string, { main: string[]; other: string[] }>)[d]
      : (raw as Records)[m]?.[d];
  return entry ? [...new Set([...entry.main, ...entry.other])].slice(0, 2) : [];
}
