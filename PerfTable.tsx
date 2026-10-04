import type { Formatters } from '@/lib/format';
import { METRICS, pctChange, toneFor } from '@/lib/metrics';
import type { Totals } from '@/lib/types';

type Props = {
  title: string;
  meta?: string;
  variant?: 'total' | 'campaign';
  prev: Totals;
  curr: Totals;
  prevLabel: string;
  currLabel: string;
  fmt: Formatters;
};

export default function PerfTable({ title, meta, variant = 'campaign', prev, curr, prevLabel, currLabel, fmt }: Props) {
  return (
    <section className={`block ${variant}`}>
      <header className="block-head">
        <h3 title={title}>{title}</h3>
        {meta && <span className="meta">{meta}</span>}
      </header>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col" className="metric-col">
                <span className="sr-only">Metric</span>
              </th>
              <th scope="col">
                PREV<small>{prevLabel}</small>
              </th>
              <th scope="col">
                CURR<small>{currLabel}</small>
              </th>
              <th scope="col">% DIFF</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => {
              const p = m.calc(prev);
              const c = m.calc(curr);
              const change = pctChange(p, c);
              return (
                <tr key={m.key}>
                  <th scope="row">{m.label}</th>
                  <td>{fmt.value(p, m.format)}</td>
                  <td>{fmt.value(c, m.format)}</td>
                  <td className={`diff ${toneFor(m.good, change)}`}>{fmt.diff(change)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
