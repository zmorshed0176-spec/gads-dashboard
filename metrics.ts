import type { Range, Row, Totals } from './types';

export type Format = 'money' | 'money2' | 'ratio' | 'percent' | 'int' | 'decimal';
/** Which direction is an improvement: drives the green/red colouring of % DIFF. */
export type Good = 'up' | 'down' | 'neutral';

export type Metric = {
  key: string;
  label: string;
  format: Format;
  good: Good;
  calc: (t: Totals) => number | null;
};

const per = (a: number, b: number, scale = 1) => (b ? (a / b) * scale : null);

/**
 * Rows shown in every performance table, in display order.
 * Everything except the base columns from the sheet is derived here — add, remove or reorder freely.
 */
export const METRICS: Metric[] = [
  { key: 'revenue', label: 'Revenue', format: 'money', good: 'up', calc: (t) => t.value },
  { key: 'roas', label: 'ROAS', format: 'ratio', good: 'up', calc: (t) => per(t.value, t.cost) },
  { key: 'spend', label: 'Spend', format: 'money', good: 'neutral', calc: (t) => t.cost },
  { key: 'cpc', label: 'CPC', format: 'money2', good: 'down', calc: (t) => per(t.cost, t.clicks) },
  { key: 'cpa', label: 'CPA', format: 'money', good: 'down', calc: (t) => per(t.cost, t.conversions) },
  { key: 'cvr', label: 'CVR', format: 'percent', good: 'up', calc: (t) => per(t.conversions, t.clicks) },
  { key: 'aov', label: 'AOV', format: 'money', good: 'up', calc: (t) => per(t.value, t.conversions) },
  { key: 'clicks', label: 'Clicks', format: 'int', good: 'up', calc: (t) => t.clicks },
  { key: 'ctr', label: 'CTR', format: 'percent', good: 'up', calc: (t) => per(t.clicks, t.impressions) },
  { key: 'purchases', label: 'Purchases', format: 'decimal', good: 'up', calc: (t) => t.conversions },
  { key: 'cpm', label: 'CPM', format: 'money2', good: 'down', calc: (t) => per(t.cost, t.impressions, 1000) },
  { key: 'impressions', label: 'Impressions', format: 'int', good: 'neutral', calc: (t) => t.impressions },
];

/** The five scorecards at the top of the page (key from METRICS + optional label override). */
export const SCORECARDS: { key: string; label: string }[] = [
  { key: 'spend', label: 'Cost' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'cpa', label: 'CPA' },
  { key: 'roas', label: 'ROAS' },
];

export const metricByKey = (key: string) => METRICS.find((m) => m.key === key)!;

export const emptyTotals = (): Totals => ({ cost: 0, conversions: 0, value: 0, impressions: 0, clicks: 0 });

function addInto(t: Totals, r: Totals) {
  t.cost += r.cost;
  t.conversions += r.conversions;
  t.value += r.value;
  t.impressions += r.impressions;
  t.clicks += r.clicks;
}

export function aggregate(rows: Row[], range: Range) {
  const total = emptyTotals();
  const byCampaign = new Map<string, Totals>();
  for (const r of rows) {
    if (r.date < range.from || r.date > range.to) continue;
    addInto(total, r);
    let t = byCampaign.get(r.campaign);
    if (!t) byCampaign.set(r.campaign, (t = emptyTotals()));
    addInto(t, r);
  }
  return { total, byCampaign };
}

export const hasActivity = (t: Totals | undefined) =>
  !!t && (t.cost !== 0 || t.impressions !== 0 || t.clicks !== 0 || t.conversions !== 0 || t.value !== 0);

/** Fractional change from prev to curr; null when there is nothing meaningful to compare against. */
export function pctChange(prev: number | null, curr: number | null): number | null {
  if (prev == null || curr == null || prev === 0) return null;
  return (curr - prev) / Math.abs(prev);
}

export type Tone = 'good' | 'bad' | 'flat' | 'none';

export function toneFor(good: Good, change: number | null): Tone {
  if (change == null) return 'none';
  if (good === 'neutral' || Math.round(change * 100) === 0) return 'flat';
  return (change > 0) === (good === 'up') ? 'good' : 'bad';
}
