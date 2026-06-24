import { SummaryCard as SummaryCardType } from '../types';

export function SummaryCard({ title, value, description }: SummaryCardType) {
  return (
    <article className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <p className="muted-text" style={{ margin: '0 0 8px', fontSize: '0.95rem' }}>{title}</p>
          <strong style={{ fontSize: '1.8rem' }}>{value}</strong>
        </div>
      </div>
      {description ? <p className="muted-text" style={{ marginTop: 14 }}>{description}</p> : null}
    </article>
  );
}
