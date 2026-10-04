import { loadSheet } from '@/lib/sheet';
import type { LoadResult } from '@/lib/types';

// Used by the "Refresh" button: always pulls the latest sheet contents, bypassing the cache.
export const dynamic = 'force-dynamic';

export async function GET() {
  let body: LoadResult;
  try {
    body = { ok: true, data: await loadSheet({ fresh: true }) };
  } catch (e) {
    body = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  return Response.json(body, { status: body.ok ? 200 : 502, headers: { 'Cache-Control': 'no-store' } });
}
