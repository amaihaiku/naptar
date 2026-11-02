import type { CivilDate } from "./date";
import { leap } from "./date";
import type { PersonalEvent, Project } from "../model";
export function occurrence(
  e: PersonalEvent,
  year: number,
  policy: Project["leapPolicy"],
): CivilDate | null {
  if (e.kind === "birthday" && e.birthYear !== null && year < e.birthYear)
    return null;
  let month = e.month,
    day = e.day;
  if (month === 2 && day === 29 && !leap(year)) {
    month = policy === "feb28" ? 2 : 3;
    day = policy === "feb28" ? 28 : 1;
  }
  return { year, month, day };
}
export function eventsFor(
  p: Project,
  d: CivilDate,
  includeFuture = false,
): PersonalEvent[] {
  return p.events.filter((e) => {
    const date = occurrence(
      includeFuture ? { ...e, birthYear: null } : e,
      d.year,
      p.leapPolicy,
    );
    return date?.month === d.month && date.day === d.day;
  });
}
export function eventLabel(e: PersonalEvent, year: number): string {
  return (
    e.name +
    (e.kind === "birthday" &&
    e.showAge &&
    e.birthYear !== null &&
    year >= e.birthYear
      ? ` (${year - e.birthYear})`
      : "")
  );
}
