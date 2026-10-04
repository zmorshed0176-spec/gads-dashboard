'use client';

import { isISODate } from '@/lib/dates';
import type { Range } from '@/lib/types';

export const PRESETS = [7, 14, 30] as const;
export type Preset = (typeof PRESETS)[number] | 'custom';

type Props = {
  preset: Preset;
  range: Range;
  prevLabel: string;
  minDate: string;
  maxDate: string;
  onPreset: (p: Preset) => void;
  onCustom: (r: Range) => void;
};

export default function DateControls({ preset, range, prevLabel, minDate, maxDate, onPreset, onCustom }: Props) {
  // Native date inputs emit '' while a date is half-typed; only commit complete, valid dates.
  const setFrom = (v: string) => isISODate(v) && onCustom(v <= range.to ? { from: v, to: range.to } : { from: v, to: v });
  const setTo = (v: string) => isISODate(v) && onCustom(v >= range.from ? { from: range.from, to: v } : { from: v, to: v });

  return (
    <section className="controls" aria-label="Date range">
      <div className="segmented" role="group" aria-label="Quick ranges">
        {PRESETS.map((n) => (
          <button key={n} aria-pressed={preset === n} onClick={() => onPreset(n)}>
            Last {n} days
          </button>
        ))}
        <button aria-pressed={preset === 'custom'} onClick={() => onPreset('custom')}>
          Custom
        </button>
      </div>

      <div className="range-inputs">
        <label>
          <span>From</span>
          <input type="date" value={range.from} min={minDate} max={maxDate} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <span className="dash" aria-hidden="true">
          –
        </span>
        <label>
          <span>To</span>
          <input type="date" value={range.to} min={minDate} max={maxDate} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <p className="compare">
        vs. previous period <strong>{prevLabel}</strong>
      </p>
    </section>
  );
}
