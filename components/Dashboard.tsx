'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, diffDays, isISODate, todayLocal } from '@/lib/dates';
import { makeFormatters } from '@/lib/format';
import { aggregate, emptyTotals, hasActivity } from '@/lib/metrics';
import type { LoadResult, Range, SheetData } from '@/lib/types';
import DateControls, { PRESETS, type Preset } from './DateControls';
import PerfTable from './PerfTable';
import Scorecards from './Scorecards';

export default function Dashboard({ initial, title }: { initial: LoadResult; title: string }) {
  const [data, setData] = useState<SheetData | null>(initial.ok ? initial.data : null);
  const [error, setError] = useState<string | null>(initial.ok ? null : initial.error);
  const [refreshing, setRefreshing] = useState(false);
  const [today, setToday] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>(7);
  const [custom, setCustom] = useState<Range | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const urlReady = useRef(false);

  // Read the client's date and any range saved in the URL (?range=14 or ?from=…&to=…) after mount.
  useEffect(() => {
    setToday(todayLocal());
    const q = new URLSearchParams(window.location.search);
    const from = q.get('from');
    const to = q.get('to');
    const range = Number(q.get('range'));
    if (isISODate(from) && isISODate(to)) {
      setPreset('custom');
      setCustom(from <= to ? { from, to } : { from: to, to: from });
    } else if ((PRESETS as readonly number[]).includes(range)) {
      setPreset(range as Preset);
    }
    urlReady.current = true;
  }, []);

  // Keep the URL in sync so a link reproduces the same view.
  useEffect(() => {
    if (!urlReady.current) return;
    const q = new URLSearchParams(window.location.search);
    q.delete('range');
    q.delete('from');
    q.delete('to');
    if (preset === 'custom' && custom) {
      q.set('from', custom.from);
      q.set('to', custom.to);
    } else if (preset !== 'custom') q.set('range', String(preset));
    const qs = q.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [preset, custom]);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      const body = (await res.json()) as LoadResult;
      if (body.ok) {
        setData(body.data);
        setError(null);
      } else setError(body.error);
    } catch {
      setError('Could not reach the server to refresh the data.');
    } finally {
      setRefreshing(false);
    }
  }

  // "Last N days" ends on the last complete day in the sheet (never today, which is still partial).
  const anchor = useMemo(() => {
    if (!data) return null;
    if (today && data.maxDate >= today) return addDays(today, -1);
    return data.maxDate;
  }, [data, today]);

  const curr: Range | null = useMemo(() => {
    if (!anchor) return null;
    if (preset === 'custom' && custom) return custom;
    const n = preset === 'custom' ? 7 : preset;
    return { from: addDays(anchor, -(n - 1)), to: anchor };
  }, [anchor, preset, custom]);

  const prev: Range | null = useMemo(() => {
    if (!curr) return null;
    const len = diffDays(curr.from, curr.to) + 1;
    return { from: addDays(curr.from, -len), to: addDays(curr.from, -1) };
  }, [curr]);

  const fmt = useMemo(() => makeFormatters(data?.currency ?? 'AUD', data?.locale ?? 'en-AU'), [data]);

  const view = useMemo(() => {
    if (!data || !curr || !prev) return null;
    const c = aggregate(data.rows, curr);
    const p = aggregate(data.rows, prev);
    const names = new Set([...c.byCampaign.keys(), ...p.byCampaign.keys()]);
    const campaigns = [...names]
      .map((name) => ({ name, curr: c.byCampaign.get(name) ?? emptyTotals(), prev: p.byCampaign.get(name) ?? emptyTotals() }))
      .sort((a, b) => b.curr.cost - a.curr.cost || b.prev.cost - a.prev.cost || a.name.localeCompare(b.name));
    const active = campaigns.filter((x) => hasActivity(x.curr) || hasActivity(x.prev));
    return { total: { curr: c.total, prev: p.total }, campaigns, active };
  }, [data, curr, prev]);

  const staleDays = data && today ? diffDays(data.maxDate, today) : 0;

  if (!data || !curr || !prev || !view) {
    return (
      <main className="page">
        <header className="topbar">
          <h1>{title}</h1>
        </header>
        <div className="notice error" role="alert">
          <strong>Couldn&apos;t load the data.</strong>
          <p>{error ?? 'Unknown error.'}</p>
          <button className="btn" onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      </main>
    );
  }

  const shown = showInactive ? view.campaigns : view.active;
  const hiddenCount = view.campaigns.length - view.active.length;
  const prevLabel = fmt.range(prev.from, prev.to);
  const currLabel = fmt.range(curr.from, curr.to);

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1>{title}</h1>
          <p className="sub">
            Data through {fmt.date(data.maxDate)} · {data.currency} · loaded {fmt.time(data.fetchedAt)}
          </p>
        </div>
        <button className="btn" onClick={refresh} disabled={refreshing} aria-label="Refresh data from the sheet">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" className={refreshing ? 'spin' : ''}>
            <path d="M16 10a6 6 0 1 1-1.76-4.24M16 4v3.5h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div className="notice error" role="alert">
          Refresh failed: {error} Showing the last loaded data.
        </div>
      )}
      {staleDays > 2 && (
        <div className="notice warn">
          The newest row in the sheet is from {fmt.date(data.maxDate)} ({staleDays} days ago) — check that the export script is still running.
        </div>
      )}
      {data.warnings.map((w) => (
        <div key={w} className="notice warn">
          {w}
        </div>
      ))}

      <DateControls
        preset={preset}
        range={curr}
        prevLabel={prevLabel}
        minDate={data.minDate}
        maxDate={data.maxDate}
        onPreset={(p) => {
          setPreset(p);
          if (p === 'custom') setCustom(curr);
        }}
        onCustom={(r) => {
          setPreset('custom');
          setCustom(r);
        }}
      />

      <Scorecards prev={view.total.prev} curr={view.total.curr} fmt={fmt} />

      <div className="blocks">
        <PerfTable title="Account Total" variant="total" prev={view.total.prev} curr={view.total.curr} prevLabel={prevLabel} currLabel={currLabel} fmt={fmt} />

        <div className="section-head">
          <h2>Campaigns</h2>
          <span className="count">{shown.length}</span>
          {hiddenCount > 0 && (
            <label className="toggle">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Show {hiddenCount} campaign{hiddenCount === 1 ? '' : 's'} with no activity
            </label>
          )}
        </div>

        {shown.length === 0 && <p className="empty">No campaign activity in either period.</p>}
        {shown.map((c) => {
          const share = view.total.curr.cost ? c.curr.cost / view.total.curr.cost : 0;
          return (
            <PerfTable
              key={c.name}
              title={c.name}
              meta={view.total.curr.cost ? `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}% of current spend` : undefined}
              prev={c.prev}
              curr={c.curr}
              prevLabel={prevLabel}
              currLabel={currLabel}
              fmt={fmt}
            />
          );
        })}
      </div>

      <footer className="foot">Previous period = the same number of days immediately before the selected range.</footer>
    </main>
  );
}
