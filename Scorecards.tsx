import type { Formatters } from '@/lib/format';
import { SCORECARDS, metricByKey, pctChange, toneFor } from '@/lib/metrics';
import type { Totals } from '@/lib/types';

export default function Scorecards({ prev, curr, fmt }: { prev: Totals; curr: Totals; fmt: Formatters }) {
  return (
    <section className="scorecards" aria-label="Account totals">
      {SCORECARDS.map(({ key, label }) => {
        const m = metricByKey(key);
        const p = m.calc(prev);
        const c = m.calc(curr);
        const change = pctChange(p, c);
        return (
          <article key={key} className="card">
            <h3>{label}</h3>
            <p className="big">{fmt.value(c, m.format)}</p>
            <p className="delta-line">
              <span className={`chip ${toneFor(m.good, change)}`}>{fmt.diff(change)}</span>
              <span className="was">prev {fmt.value(p, m.format)}</span>
            </p>
          </article>
        );
      })}
    </section>
  );
}
