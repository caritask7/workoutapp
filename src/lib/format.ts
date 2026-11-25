const nf = (min: number, max: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: min, maximumFractionDigits: max });

const NF0 = nf(0, 0);
const NF1 = nf(0, 1);
const NF1_FIXED = nf(1, 1);

/** 12 450 — séparateur de milliers français. */
export const formatInt = (n: number) => NF0.format(n);
/** 72,4 — une décimale maximum. */
export const formatDecimal = (n: number) => NF1.format(n);
/** 72,0 — une décimale imposée (poids). */
export const formatKg = (n: number) => NF1_FIXED.format(n);

/** Variation signée : « +1,8 », « −0,5 », « 0 ». */
export function formatDelta(n: number, decimals = 1): string {
  const v = nf(0, decimals).format(Math.abs(n));
  if (n > 0) return `+${v}`;
  if (n < 0) return `−${v}`;
  return v;
}

/** 01:15 ou 1:02:03 (chronomètres). */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** « 68 min », « 1 h 05 ». */
export function formatDuration(totalSec: number): string {
  const min = Math.round(totalSec / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

const DATE_SHORT = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const DATE_LONG = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const DATE_DAY_MONTH = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

const asDate = (v: string | Date) =>
  v instanceof Date ? v : /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v);

/** « lun. 10 févr. » */
export const formatDateShort = (v: string | Date) => DATE_SHORT.format(asDate(v));
/** « lundi 10 février » */
export const formatDateLong = (v: string | Date) => DATE_LONG.format(asDate(v));
/** « 10 févr. » */
export const formatDayMonth = (v: string | Date) => DATE_DAY_MONTH.format(asDate(v));

export const pluralize = (n: number, one: string, many: string) => `${formatInt(n)} ${n > 1 ? many : one}`;
