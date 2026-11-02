import { describe, expect, it, each } from "./assert";
import {
  addDays,
  daysInMonth,
  easter,
  fromOrdinal,
  isoWeek,
  leap,
  monthCells,
  ordinal,
  weekday,
  validDate,
} from "../src/engines/date";
import { holidays, holidayStatus } from "../src/engines/holidays";
// Independent Sakamoto weekday calculation (Sunday=0), with explicit floor division.
function referenceWeekday(y: number, m: number, d: number) {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  if (m < 3) y--;
  const sun =
    (y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) +
      t[m - 1] +
      d) %
    7;
  return sun === 0 ? 7 : sun;
}
// Gauss computus, including both exceptional epact corrections.
function referenceEaster(y: number) {
  const a = y % 19,
    b = y % 4,
    c = y % 7,
    k = Math.floor(y / 100),
    p = Math.floor((13 + 8 * k) / 25),
    q = Math.floor(k / 4),
    M = (15 - p + k - q) % 30,
    N = (4 + k - q) % 7,
    d = (19 * a + M) % 30,
    e = (2 * b + 4 * c + 6 * d + N) % 7;
  let n = 22 + d + e;
  if (d === 29 && e === 6) n = 50;
  if (d === 28 && e === 6 && (11 * M + 11) % 30 < 19) n = 49;
  return { year: y, month: n > 31 ? 4 : 3, day: n > 31 ? n - 31 : n };
}
describe("Deterministic Gregorian date engine", () => {
  each([1, 99, 100, 400, 1900, 2000, 2024, 2025, 2026, 2100, 2400, 9999])(
    "year %i round trips and weekday references",
    (year) => {
      for (let month = 1; month <= 12; month++)
        for (let day = 1; day <= daysInMonth(year, month); day++) {
          const d = { year, month, day };
          expect(fromOrdinal(ordinal(d))).toEqual(d);
          expect(weekday(d)).toBe(referenceWeekday(year, month, day));
        }
    },
  );
  it("exhaustively checks one 400-year Gregorian cycle against an independent method", () => {
    for (let y = 1; y <= 400; y++)
      for (let m = 1; m <= 12; m++)
        for (let d = 1; d <= daysInMonth(y, m); d++) {
          const actual = weekday({ year: y, month: m, day: d });
          if (actual !== referenceWeekday(y, m, d))
            throw new Error(`Weekday mismatch: ${y}-${m}-${d}`);
          if (
            y + 400 <= 9999 &&
            weekday({ year: y + 400, month: m, day: d }) !== actual
          )
            throw new Error("400-year cycle mismatch");
        }
  });
  each([
    [1900, false],
    [2000, true],
    [2024, true],
    [2100, false],
    [2400, true],
  ])("leap year %i = %s", (y, expected) =>
    expect(leap(y as number)).toBe(expected),
  );
  it("never produces out-of-range adjacent dates", () => {
    expect(addDays({ year: 1, month: 1, day: 1 }, -1)).toBeNull();
    expect(addDays({ year: 9999, month: 12, day: 31 }, 1)).toBeNull();
    for (const d of [...monthCells(1, 1, 7), ...monthCells(9999, 12, 1)])
      if (d) expect(validDate(d)).toBe(true);
  });
  each([
    [2021, 2, 1, 4],
    [2027, 3, 1, 5],
    [2026, 8, 1, 6],
    [2027, 3, 7, 5],
  ])("month row count %i-%i first %i = %i", (year, month, first, rows) =>
    expect(monthCells(year, month, first as 1 | 7).length / 7).toBe(rows),
  );
  it("first-weekday rearrangement preserves actual weekdays", () => {
    expect(monthCells(2027, 3, 1)[0]).toEqual({ year: 2027, month: 3, day: 1 });
    expect(monthCells(2027, 3, 7)[0]).toEqual({
      year: 2027,
      month: 2,
      day: 28,
    });
    expect(weekday({ year: 2027, month: 3, day: 1 })).toBe(1);
  });
  each([
    [2021, 1, 1, 2020, 53],
    [2027, 1, 1, 2026, 53],
    [2024, 12, 30, 2025, 1],
    [1, 1, 1, 1, 1],
  ])("ISO boundary %i-%i-%i", (year, month, day, weekYear, week) =>
    expect(isoWeek({ year, month, day })).toEqual({ year: weekYear, week }),
  );
  each([
    [2024, 3, 31],
    [2025, 4, 20],
    [2026, 4, 5],
    [2027, 3, 28],
  ])("independent known Easter example %i", (year, month, day) =>
    expect(easter(year)).toEqual({ year, month, day }),
  );
  it("cross-validates Easter for all supported years against Gauss", () => {
    for (let year = 1; year <= 9999; year++) {
      const e = easter(year);
      expect(e).toEqual(referenceEaster(year));
      expect(weekday(e)).toBe(7);
      const em = addDays(e, 1)!,
        ps = addDays(e, 49)!,
        pm = addDays(e, 50)!;
      expect(ordinal(em) - ordinal(e)).toBe(1);
      expect(weekday(ps)).toBe(7);
      expect(ordinal(pm) - ordinal(e)).toBe(50);
    }
  });
  it("separates verified legal data from projections and does not invent bridge days", () => {
    expect(holidayStatus(2026)).toContain("Ellenőrzött");
    expect(holidayStatus(1600)).toContain("Vetített");
    expect(holidayStatus(2027)).toContain("Vetített");
    expect(holidays(2027).get("3-26")).toBe("Nagypéntek");
    expect(holidays(2027).get("3-29")).toBe("Húsvéthétfő");
    expect(holidays(2027).get("5-17")).toBe("Pünkösdhétfő");
    expect(holidays(2027).size).toBe(11);
    expect(holidays(2027).has("12-24")).toBe(false);
  });
});
