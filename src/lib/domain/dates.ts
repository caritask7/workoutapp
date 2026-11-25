import type { IsoDate, Weekday } from "@/types/domain";

const pad = (n: number) => String(n).padStart(2, "0");

/** Date calendaire locale `YYYY-MM-DD`. */
export function toIsoDate(date: Date = new Date()): IsoDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Interprète `YYYY-MM-DD` à minuit, heure locale. */
export function parseIsoDate(value: IsoDate): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(date);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Nombre de jours calendaires entre deux dates (b − a). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  const ms = parseIsoDate(b).getTime() - parseIsoDate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Jour ISO : 1 = lundi … 7 = dimanche. */
export function isoWeekday(date: IsoDate): Weekday {
  const day = parseIsoDate(date).getDay();
  return (day === 0 ? 7 : day) as Weekday;
}

/** Lundi de la semaine contenant `date`. */
export function startOfWeek(date: IsoDate): IsoDate {
  return addDays(date, 1 - isoWeekday(date));
}

/** Les 7 dates (lundi → dimanche) de la semaine contenant `date`. */
export function weekDates(date: IsoDate): IsoDate[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Date locale d'un horodatage ISO. */
export function isoDateOf(dateTime: string): IsoDate {
  return toIsoDate(new Date(dateTime));
}

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mer",
  4: "Jeu",
  5: "Ven",
  6: "Sam",
  7: "Dim",
};

export const WEEKDAY_LONG: Record<Weekday, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  7: "Dimanche",
};
