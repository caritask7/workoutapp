import type { Query } from "./driver";

/** Normalise une chaîne pour la recherche : minuscules, sans accents. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Applique une `Query` à un tableau en mémoire (driver local, tests). */
export function applyQuery<R>(rows: R[], query: Query<R> = {}): R[] {
  let out = rows;
  const rec = (r: R) => r as unknown as Record<string, unknown>;

  if (query.where) {
    const entries = Object.entries(query.where).filter(([, v]) => v !== undefined);
    out = out.filter((r) => entries.every(([k, v]) => rec(r)[k] === v));
  }
  if (query.in) {
    const { field, values } = query.in;
    const set = new Set(values);
    out = out.filter((r) => set.has(rec(r)[field] as never));
  }
  if (query.range) {
    const { field, gte, lte } = query.range;
    out = out.filter((r) => {
      const v = rec(r)[field] as string | number | null;
      if (v === null || v === undefined) return false;
      if (gte !== undefined && v < gte) return false;
      if (lte !== undefined && v > lte) return false;
      return true;
    });
  }
  if (query.search && query.search.term.trim()) {
    const { field } = query.search;
    const tokens = normalizeText(query.search.term).split(/\s+/);
    out = out.filter((r) => {
      const hay = normalizeText(String(rec(r)[field] ?? ""));
      return tokens.every((t) => hay.includes(t));
    });
  }
  if (query.orderBy) {
    const { field, direction = "asc" } = query.orderBy;
    const sign = direction === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      const va = rec(a)[field] as string | number | null;
      const vb = rec(b)[field] as string | number | null;
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      return va < vb ? -sign : sign;
    });
  }
  if (query.limit !== undefined) out = out.slice(0, query.limit);
  return out;
}
