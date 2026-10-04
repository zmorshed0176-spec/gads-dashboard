/** One row of the sheet: one campaign on one day. */
export type Row = {
  date: string; // YYYY-MM-DD
  campaign: string;
  cost: number;
  conversions: number;
  value: number;
  impressions: number;
  clicks: number;
};

/** Summed base metrics for a campaign (or the account) over a date range. */
export type Totals = Omit<Row, 'date' | 'campaign'>;

export type SheetData = {
  rows: Row[];
  currency: string;
  locale: string;
  minDate: string;
  maxDate: string;
  fetchedAt: string;
  warnings: string[];
};

export type LoadResult = { ok: true; data: SheetData } | { ok: false; error: string };

export type Range = { from: string; to: string };
