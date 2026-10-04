// All dates are handled as 'YYYY-MM-DD' strings; arithmetic is done in UTC so timezones never shift a day.
const DAY = 86_400_000;

export const toUTC = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
export const fromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => fromUTC(toUTC(s) + n * DAY);
/** Number of days from a to b (b - a). */
export const diffDays = (a: string, b: string) => Math.round((toUTC(b) - toUTC(a)) / DAY);
export const isISODate = (s: string | null | undefined): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUTC(s)) && fromUTC(toUTC(s)) === s;

export function todayLocal(): string {
  const d = new Date();
  return isoFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate())!;
}

export function isoFromParts(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const s = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return isISODate(s) ? s : null;
}

export type DateOrder = 'DMY' | 'MDY';

/** Parses the date formats Google Sheets / Ads scripts commonly emit into 'YYYY-MM-DD'. */
export function parseDate(raw: string, order: DateOrder): string | null {
  const v = raw.trim();
  if (!v) return null;
  let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return isoFromParts(+m[1], +m[2], +m[3]);
  m = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return isoFromParts(+m[1], +m[2], +m[3]);
  m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return order === 'DMY' ? isoFromParts(y, +m[2], +m[1]) : isoFromParts(y, +m[1], +m[2]);
  }
  // Sheets serial date number (days since 1899-12-30)
  if (/^\d{5}(\.\d+)?$/.test(v)) return fromUTC(Date.UTC(1899, 11, 30) + Math.floor(+v) * DAY);
  const t = Date.parse(v);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    return isoFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  return null;
}

/** Works out whether slash dates are day-first or month-first by looking at the whole column. */
export function detectDateOrder(values: string[], fallback: DateOrder): DateOrder {
  for (const v of values) {
    const m = v.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/);
    if (!m) continue;
    if (+m[1] > 12) return 'DMY';
    if (+m[2] > 12) return 'MDY';
  }
  return fallback;
}
