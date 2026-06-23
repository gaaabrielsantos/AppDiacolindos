import { SummaryCard as SummaryCardType } from '../types';

export function SummaryCard({ title, value, description }: SummaryCardType) {
  return (
    <article className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '0.95rem' }}>{title}</p>
          <strong style={{ fontSize: '1.8rem' }}>{value}</strong>
        </div>
      </div>
      {description ? <p style={{ marginTop: 14, color: '#6b7280' }}>{description}</p> : null}
    </article>
  );
}
