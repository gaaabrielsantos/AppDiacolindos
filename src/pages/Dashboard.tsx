import { useMemo } from 'react';
import { SummaryCard } from '../components/SummaryCard';
import { useAppState } from '../hooks/useAppState';

export function DashboardPage() {
  const { members, schedule, alerts } = useAppState();

  const totalMembers = members.length;
  const activeMembers = useMemo(() => members.filter((member) => member.active).length, [members]);
  const inactiveMembers = totalMembers - activeMembers;

  const participationCounts = useMemo(() => {
    const freq: Record<string, number> = {};
    members.forEach((member) => {
      freq[member.id] = 0;
    });
    schedule.forEach((item) => {
      item.memberIds.forEach((memberId) => {
        freq[memberId] = (freq[memberId] ?? 0) + 1;
      });
    });
    return freq;
  }, [members, schedule]);

  const chartData = useMemo(
    () => members.map((member) => ({
      id: member.id,
      name: member.nickname || member.name,
      value: participationCounts[member.id] ?? 0,
    })),
    [members, participationCounts]
  );

  const mean = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length;
  }, [chartData]);

  const minParticipation = useMemo(() => Math.min(...chartData.map((item) => item.value), 0), [chartData]);
  const maxParticipation = useMemo(() => Math.max(...chartData.map((item) => item.value), 0), [chartData]);
  const participationDiff = maxParticipation - minParticipation;

  const maxValue = Math.max(...chartData.map((item) => item.value), 1);
  const incompleteEvents = schedule.filter((item) => item.memberIds.length < item.requiredMembers);
  const hasAvailabilityRestriction = members.some((member) => member.unavailability.length > 0);
  const isBalanced = participationDiff <= 1;
  const shouldShowRedAlert = participationDiff > 1 && !hasAvailabilityRestriction && incompleteEvents.length === 0;

  return (
    <div className="container">
      <main className="page-content">
        <section className="page-section">
          <h1 className="page-title">Painel de controle</h1>
        </section>

        <section className="page-section">
          <div className="grid-3">
            <SummaryCard title="Integrantes cadastrados" value={String(totalMembers)} />
            <SummaryCard title="Integrantes ativos" value={String(activeMembers)} />
            <SummaryCard title="Integrantes inativos" value={String(inactiveMembers)} />
          </div>
        </section>

        <section className="page-section">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Gráfico de participações por integrante</h2>
            <p className="muted-text">Comparação visual de participações na escala atual.</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, minHeight: 220, paddingTop: 16, flexWrap: 'wrap' }}>
              {chartData.map((item) => {
                const height = `${(item.value / maxValue) * 180}px`;
                const highlight = shouldShowRedAlert && item.value === maxParticipation;
                return (
                  <div key={item.id} style={{ flex: '1 1 64px', minWidth: 64, textAlign: 'center', maxWidth: 120 }}>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>{item.value}</div>
                    <div
                      title={`${item.name}: ${item.value}`}
                      style={{
                        height,
                        minHeight: 4,
                        borderRadius: '8px 8px 0 0',
                        background: highlight ? 'var(--danger)' : 'var(--primary)',
                      }}
                    />
                    <div style={{ fontSize: 12, marginTop: 8, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="muted-text" style={{ marginTop: 10 }}>Média de participações: <strong>{mean.toFixed(1)}</strong></p>
            {isBalanced ? (
              <p style={{ color: 'var(--primary-strong)', marginTop: 8 }}>
                Escala equilibrada: a diferença entre os integrantes está dentro do limite esperado.
              </p>
            ) : shouldShowRedAlert ? (
              <p style={{ color: 'var(--danger)', marginTop: 12 }}>
                Atenção: desequilíbrio relevante na escala (diferença atual: {participationDiff}).
              </p>
            ) : (
              <p style={{ color: 'var(--primary)', marginTop: 12 }}>
                Diferença acima de 1 detectada, possivelmente por indisponibilidade/restrições no período.
              </p>
            )}
          </div>
        </section>

        <section className="page-section">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Alertas</h2>
            {alerts.length > 0 || incompleteEvents.length > 0 ? (
              <ul>
                {alerts.slice(0, 8).map((alert, index) => (
                  <li key={index}>{alert}</li>
                ))}
              </ul>
            ) : (
              <p>Nenhum alerta no momento.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
