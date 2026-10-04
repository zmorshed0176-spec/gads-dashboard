import { parseCSV } from './csv';
import { detectDateOrder, parseDate, type DateOrder } from './dates';
import type { Row, SheetData } from './types';

/** How long (seconds) the sheet is cached before it's fetched again. */
export const REVALIDATE_SECONDS = 300;

type Field = 'date' | 'campaign' | 'cost' | 'costMicros' | 'conversions' | 'value' | 'impressions' | 'clicks' | 'currency';

// Header names are matched after lowercasing, dropping anything in brackets, and removing non-alphanumerics,
// so "Conversion Value", "conversion_value" and "Conv. value (AUD)" all match.
const HEADER_ALIASES: Record<Field, string[]> = {
  date: ['date', 'day', 'segmentsdate', 'reportdate'],
  campaign: ['campaign', 'campaignname', 'campaigns'],
  cost: ['cost', 'spend', 'amountspent', 'adspend', 'metricscost'],
  costMicros: ['costmicros', 'metricscostmicros'],
  conversions: ['conversion', 'conversions', 'conv', 'convs', 'purchases', 'purchase', 'metricsconversions'],
  value: [
    'conversionvalue', 'conversionsvalue', 'convvalue', 'revenue', 'value', 'purchasevalue',
    'totalconvvalue', 'metricsconversionsvalue',
  ],
  impressions: ['impr', 'imprs', 'impression', 'impressions', 'metricsimpressions'],
  clicks: ['click', 'clicks', 'metricsclicks'],
  currency: ['currency', 'currencycode', 'customercurrencycode'],
};

const LOCALE_BY_CURRENCY: Record<string, string> = {
  AUD: 'en-AU', USD: 'en-US', GBP: 'en-GB', EUR: 'en-IE', CAD: 'en-CA', NZD: 'en-NZ',
  SGD: 'en-SG', INR: 'en-IN', ZAR: 'en-ZA', HKD: 'en-HK', JPY: 'ja-JP', CHF: 'de-CH',
};

const normalizeHeader = (h: string) => h.toLowerCase().replace(/\(.*?\)|\[.*?\]/g, '').replace(/[^a-z0-9]/g, '');

function sheetCsvUrl(): string {
  const raw = process.env.SHEET_URL?.trim();
  const sheetId = process.env.SHEET_ID?.trim() || raw?.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];

  // Any non-Google-Sheets URL (e.g. a "Publish to web" CSV link) is used as-is.
  if (!sheetId) {
    if (raw && /^https?:\/\//.test(raw)) return raw;
    throw new Error('No sheet configured. Set the SHEET_URL environment variable to your Google Sheet URL.');
  }
  if (raw && /output=csv|format=csv|tqx=out:csv/.test(raw)) return raw;

  const name = process.env.SHEET_NAME?.trim();
  if (name) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
  }
  const gid = process.env.SHEET_GID?.trim() || raw?.match(/[#&?]gid=(\d+)/)?.[1] || '0';
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

function toNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/[^0-9.\-eE]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export async function loadSheet({ fresh = false } = {}): Promise<SheetData> {
  const url = sheetCsvUrl();
  const res = await fetch(url, fresh ? { cache: 'no-store' } : { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) {
    throw new Error(
      `Couldn't download the sheet (HTTP ${res.status}). Make sure sharing is set to "Anyone with the link → Viewer" and the tab exists.`,
    );
  }
  const text = await res.text();
  if ((res.headers.get('content-type') || '').includes('text/html') || /^\s*<!DOCTYPE html/i.test(text)) {
    throw new Error('Google returned a web page instead of CSV data. Set the sheet sharing to "Anyone with the link → Viewer".');
  }
  return parseSheet(text);
}

export function parseSheet(text: string): SheetData {
  const table = parseCSV(text);
  const warnings: string[] = [];

  // The header row is the first row that has both a date and a campaign column (title rows above it are skipped).
  const headerIdx = table.findIndex((r) => {
    const n = r.map(normalizeHeader);
    return n.some((h) => HEADER_ALIASES.date.includes(h)) && n.some((h) => HEADER_ALIASES.campaign.includes(h));
  });
  if (headerIdx === -1) {
    throw new Error('Could not find a header row with "date" and "campaign" columns in the sheet.');
  }
  const headers = table[headerIdx];
  const normalized = headers.map(normalizeHeader);
  const col = {} as Record<Field, number>;
  for (const field of Object.keys(HEADER_ALIASES) as Field[]) {
    col[field] = normalized.findIndex((h) => HEADER_ALIASES[field].includes(h));
  }
  if (col.cost === -1 && col.costMicros === -1) throw new Error('Could not find a "cost" column in the sheet.');
  for (const [field, label] of [['conversions', 'conversion'], ['value', 'conversion value'], ['impressions', 'impr'], ['clicks', 'clicks']] as const) {
    if (col[field] === -1) warnings.push(`No "${label}" column found — it is treated as 0.`);
  }

  const body = table.slice(headerIdx + 1);

  // Currency: sheet column → code in a header like "Cost (AUD)" → CURRENCY env var → AUD.
  const fromColumn = col.currency >= 0 ? body.find((r) => /^[A-Za-z]{3}$/.test(r[col.currency]?.trim() ?? ''))?.[col.currency] : undefined;
  const fromHeader = headers.map((h) => h.match(/[([]\s*([A-Z]{3})\s*[)\]]/)?.[1]).find(Boolean);
  const currency = (fromColumn || fromHeader || process.env.CURRENCY || 'AUD').trim().toUpperCase();
  const locale = process.env.LOCALE?.trim() || LOCALE_BY_CURRENCY[currency] || 'en-US';

  const envOrder = process.env.DATE_ORDER?.trim().toUpperCase();
  const fallbackOrder: DateOrder = envOrder === 'MDY' || envOrder === 'DMY' ? envOrder : locale === 'en-US' ? 'MDY' : 'DMY';
  const order = envOrder === 'MDY' || envOrder === 'DMY' ? envOrder : detectDateOrder(body.map((r) => r[col.date] ?? ''), fallbackOrder);

  const rows: Row[] = [];
  let skipped = 0;
  for (const r of body) {
    const date = parseDate(r[col.date] ?? '', order);
    const campaign = (r[col.campaign] ?? '').trim();
    if (!date || !campaign) {
      skipped++;
      continue;
    }
    rows.push({
      date,
      campaign,
      cost: col.cost >= 0 ? toNumber(r[col.cost]) : toNumber(r[col.costMicros]) / 1e6,
      conversions: toNumber(r[col.conversions]),
      value: toNumber(r[col.value]),
      impressions: toNumber(r[col.impressions]),
      clicks: toNumber(r[col.clicks]),
    });
  }
  if (skipped) warnings.push(`${skipped} row${skipped === 1 ? '' : 's'} skipped because the date or campaign was missing/unreadable.`);
  if (!rows.length) throw new Error('The sheet has a header row but no readable data rows.');

  let minDate = rows[0].date;
  let maxDate = rows[0].date;
  for (const r of rows) {
    if (r.date < minDate) minDate = r.date;
    if (r.date > maxDate) maxDate = r.date;
  }

  return { rows, currency, locale, minDate, maxDate, fetchedAt: new Date().toISOString(), warnings };
}
