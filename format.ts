import type { Format } from './metrics';
import { toUTC } from './dates';

export type Formatters = ReturnType<typeof makeFormatters>;

export function makeFormatters(currency: string, locale: string) {
  const money = (dp: number) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: dp, maximumFractionDigits: dp });
    } catch {
      // Unknown currency code in the sheet — fall back to a plain number with the code in front.
      const n = new Intl.NumberFormat(locale, { minimumFractionDigits: dp, maximumFractionDigits: dp });
      return { format: (v: number) => `${currency} ${n.format(v)}` };
    }
  };
  const money0 = money(0);
  const money2 = money(2);
  const int = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const ratio = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const percent = new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const diffWhole = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' });
  const diffFine = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' });
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const full = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });

  const value = (v: number | null, format: Format): string => {
    if (v == null || !Number.isFinite(v)) return '—';
    switch (format) {
      case 'money':
        return Math.abs(v) >= 100 ? money0.format(v) : money2.format(v);
      case 'money2':
        return money2.format(v);
      case 'ratio':
        return ratio.format(v);
      case 'percent':
        return percent.format(v);
      case 'int':
        return int.format(v);
      case 'decimal':
        return decimal.format(v);
    }
  };

  const diff = (d: number | null) => (d == null ? '—' : Math.abs(d) < 0.1 ? diffFine.format(d) : diffWhole.format(d));

  const date = (iso: string) => full.format(toUTC(iso));
  const range = (from: string, to: string) => {
    if (from === to) return date(from);
    const sameYear = from.slice(0, 4) === to.slice(0, 4);
    return `${sameYear ? dayMonth.format(toUTC(from)) : date(from)} – ${date(to)}`;
  };

  return { value, diff, date, range, time: (iso: string) => time.format(new Date(iso)) };
}
