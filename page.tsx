import Dashboard from '@/components/Dashboard';
import { loadSheet } from '@/lib/sheet';
import type { LoadResult } from '@/lib/types';

// Re-fetch the sheet at most every 5 minutes (keep in sync with REVALIDATE_SECONDS in lib/sheet.ts).
export const revalidate = 300;

export default async function Page() {
  let initial: LoadResult;
  try {
    initial = { ok: true, data: await loadSheet() };
  } catch (e) {
    initial = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  return <Dashboard initial={initial} title={process.env.DASHBOARD_TITLE || 'Google Ads Performance'} />;
}
