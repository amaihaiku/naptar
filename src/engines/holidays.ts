import type { Project, HolidaySetting } from "../model";
import { addDays, dateKey, easter, daysInMonth } from "./date";
export const holidayRules = {
  id: "HU-MT-2026",
  verifiedFrom: 2017,
  verifiedThrough: 2026,
  checkedOn: "2026-11-05",
  source: "https://njt.hu/jogszabaly/2012-1-00-00",
  updateSource:
    "https://kormany.hu/hirek/munkaszuneti-nappa-nyilvanitotta-az-orszaggyules-december-24-et",
  fixed: [
    ["1-1", "Újév"],
    ["3-15", "Nemzeti ünnep"],
    ["5-1", "A munka ünnepe"],
    ["8-20", "Az államalapítás ünnepe"],
    ["10-23", "Nemzeti ünnep"],
    ["11-1", "Mindenszentek"],
    ["12-25", "Karácsony"],
    ["12-26", "Karácsony másnapja"],
  ],
};
export function holidayStatus(y: number): string {
  return y >= holidayRules.verifiedFrom && y <= holidayRules.verifiedThrough
    ? "Ellenőrzött ünnepnap-szabályok (2017–2026)"
    : y > 2026
      ? "Vetített ünnepnapok a 2026-os szabályrendszer szerint"
      : "Vetített ünnepnapok a 2017-es modern szabályrendszer szerint";
}
export function holidays(y: number): Map<string, string> {
  const result = new Map(holidayRules.fixed as [string, string][]);
  const e = easter(y);
  for (const [offset, name] of [
    [-2, "Nagypéntek"],
    [1, "Húsvéthétfő"],
    [50, "Pünkösdhétfő"],
  ] as const) {
    const d = addDays(e, offset);
    if (d) result.set(dateKey(d), name);
  }
  if (y >= 2026) result.set("12-24", "Szenteste");
  return result;
}

// Printed observances include dates that are not part of the statutory holiday map.
export function holidayLabels(year: number): Map<string, string> {
  const labels = holidays(year);
  for (const [key, label] of [
    ["5-1", "Munka ünnepe"],
    ["8-20", "Államalapítás"],
    ["12-24", "Szenteste"],
    ["12-26", "Karácsony"],
  ])
    labels.set(key, label);
  const date = easter(year);
  for (const [offset, label] of [
    [0, "Húsvét vasárnap"],
    [1, "Húsvét hétfő"],
    [49, "Pünkösd vasárnap"],
    [50, "Pünkösd hétfő"],
  ] as const) {
    const day = addDays(date, offset);
    if (day) labels.set(dateKey(day), label);
  }
  return labels;
}

export interface CalendarHoliday extends HolidaySetting {
  id: string;
  month: number;
  day: number;
  custom: boolean;
}
export function calendarHolidays(p: Project): CalendarHoliday[] {
  const e = easter(p.year);
  const defaults: CalendarHoliday[] = [];
  const append = (id: string, month: number, day: number, name: string) => {
    const saved = p.holidayOverrides?.[id];
    if (saved === null) return;
    defaults.push({
      id,
      month,
      day,
      custom: false,
      name,
      showName: true,
      highlight: p.style.highlight,
      ...saved,
    });
  };
  for (const [key, name] of holidayRules.fixed) {
    const [month, day] = key.split("-").map(Number);
    append(
      "fixed-" + key,
      month,
      day,
      (
        {
          "5-1": "Munka ünnepe",
          "8-20": "Államalapítás",
          "12-26": "Karácsony",
        } as Record<string, string>
      )[key] ?? name,
    );
  }
  if (p.year >= 2026) append("fixed-12-24", 12, 24, "Szenteste");
  for (const [offset, name] of [
    [-2, "Nagypéntek"],
    [0, "Húsvét vasárnap"],
    [1, "Húsvét hétfő"],
    [49, "Pünkösd vasárnap"],
    [50, "Pünkösd hétfő"],
  ] as const) {
    const d = addDays(e, offset);
    if (d) append("easter-" + offset, d.month, d.day, name);
  }
  return [
    ...defaults,
    ...(p.customHolidays ?? [])
      .filter((item) => item.day <= daysInMonth(p.year, item.month))
      .map((item) => ({ ...item, custom: true })),
  ].sort(
    (a, b) => a.month - b.month || a.day - b.day || a.id.localeCompare(b.id),
  );
}
