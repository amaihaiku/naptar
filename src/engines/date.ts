export interface CivilDate {
  year: number;
  month: number;
  day: number;
}
export const months = [
  "Január",
  "Február",
  "Március",
  "Április",
  "Május",
  "Június",
  "Július",
  "Augusztus",
  "Szeptember",
  "Október",
  "November",
  "December",
];
export const weekdayLabels = [
  ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"],
  ["H", "K", "Sze", "Cs", "P", "Szo", "V"],
  ["H", "K", "Sz", "Cs", "P", "Sz", "V"],
];
export function leap(y: number): boolean {
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
}
export function daysInMonth(y: number, m: number): number {
  return (
    [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] ?? 0
  );
}
export function validDate(d: CivilDate): boolean {
  return (
    Number.isInteger(d.year) &&
    d.year >= 1 &&
    d.year <= 9999 &&
    Number.isInteger(d.month) &&
    d.month >= 1 &&
    d.month <= 12 &&
    Number.isInteger(d.day) &&
    d.day >= 1 &&
    d.day <= daysInMonth(d.year, d.month)
  );
}
// Rata Die: 0001-01-01 = 1. Only integer arithmetic, no local-time Date.
export function ordinal({ year: y, month: m, day: d }: CivilDate): number {
  const p = y - 1;
  let n =
    365 * p + Math.floor(p / 4) - Math.floor(p / 100) + Math.floor(p / 400) + d;
  for (let i = 1; i < m; i++) n += daysInMonth(y, i);
  return n;
}
export const weekday = (d: CivilDate): number =>
  ((((ordinal(d) - 1) % 7) + 7) % 7) + 1;
export function fromOrdinal(n: number): CivilDate | null {
  if (n < 1 || n > 3652059) return null;
  let lo = 1,
    hi = 10000;
  while (lo + 1 < hi) {
    const y = Math.floor((lo + hi) / 2);
    if (ordinal({ year: y, month: 1, day: 1 }) <= n) lo = y;
    else hi = y;
  }
  let m = 1,
    d = n - ordinal({ year: lo, month: 1, day: 1 }) + 1;
  while (d > daysInMonth(lo, m)) d -= daysInMonth(lo, m++);
  return { year: lo, month: m, day: d };
}
export const addDays = (d: CivilDate, n: number): CivilDate | null =>
  fromOrdinal(ordinal(d) + n);
export function isoWeek(d: CivilDate): { year: number; week: number } {
  const th = ordinal(d) + 4 - weekday(d); // virtual boundary years are safe in ordinal()
  let y = d.year;
  if (th < ordinal({ year: y, month: 1, day: 1 })) y--;
  else if (th >= ordinal({ year: y + 1, month: 1, day: 1 })) y++;
  const jan4 = { year: y, month: 1, day: 4 };
  return {
    year: y,
    week: Math.floor((th - (ordinal(jan4) + 4 - weekday(jan4))) / 7) + 1,
  };
}
export function monthCells(
  year: number,
  month: number,
  first: 1 | 7,
): Array<CivilDate | null> {
  const start = { year, month, day: 1 };
  const offset = (weekday(start) - first + 7) % 7;
  const count = Math.ceil((offset + daysInMonth(year, month)) / 7) * 7;
  return Array.from({ length: count }, (_, i) => addDays(start, i - offset));
}
export function easter(year: number): CivilDate {
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100,
    d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451),
    n = h + l - 7 * m + 114;
  return { year, month: Math.floor(n / 31), day: (n % 31) + 1 };
}
export const dateKey = (d: CivilDate) => `${d.month}-${d.day}`;
