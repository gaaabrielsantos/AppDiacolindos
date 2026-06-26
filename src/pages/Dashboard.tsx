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
    () => members
      .map((member) => ({
        id: member.id,
        name: member.nickname || member.name,
        value: member.active ? (participationCounts[member.id] ?? 0) : 0,
        isActive: member.active,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
    [members, participationCounts]
  );

  const activeChartData = chartData.filter((item) => item.isActive);

  const inactiveMembersInSchedule = useMemo(() => {
    const inactives = members.filter((member) => !member.active);
    return inactives
      .map((member) => {
        const eventsCount = schedule.filter((item) => item.memberIds.includes(member.id)).length;
        return {
          id: member.id,
          name: member.nickname || member.name,
          eventsCount,
        };
      })
      .filter((item) => item.eventsCount > 0);
  }, [members, schedule]);

  const mean = useMemo(() => {
    if (activeChartData.length === 0) return 0;
    return activeChartData.reduce((sum, item) => sum + item.value, 0) / activeChartData.length;
  }, [activeChartData]);

  const minParticipation = useMemo(() => Math.min(...activeChartData.map((item) => item.value), 0), [activeChartData]);
  const maxParticipation = useMemo(() => Math.max(...activeChartData.map((item) => item.value), 0), [activeChartData]);
  const participationDiff = maxParticipation - minParticipation;

  const maxValue = Math.max(...chartData.map((item) => item.value), 1);
  const incompleteEvents = schedule.filter((item) => item.memberIds.length < item.requiredMembers);
  const hasAvailabilityRestriction = members.some((member) => member.unavailability.length > 0);
  const hasInactiveMembers = inactiveMembers > 0;
  const isBalanced = participationDiff <= 1;
  const shouldShowRedAlert = participationDiff > 1 && !hasAvailabilityRestriction && incompleteEvents.length === 0;

  const dynamicAlerts = useMemo(() => {
    const messages: string[] = [];
    if (hasInactiveMembers && schedule.length > 0) {
      messages.push('Atenção: existem integrantes inativos. É necessário gerar uma nova escala, pois alguns dias podem estar desfalcados.');
    }
    if (inactiveMembersInSchedule.length > 0) {
      messages.push('Atenção: há integrantes inativos em escalas já geradas. Gere uma nova escala para evitar dias desfalcados.');
      inactiveMembersInSchedule.forEach((item) => {
        messages.push(`${item.name} está inativo e aparece em ${item.eventsCount} eventos da escala atual. Gere uma nova escala.`);
      });
    }
    return messages;
  }, [hasInactiveMembers, inactiveMembersInSchedule, schedule.length]);

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
                const highlight = shouldShowRedAlert && item.isActive && item.value === maxParticipation;
                return (
                  <div key={item.id} style={{ flex: '1 1 64px', minWidth: 64, textAlign: 'center', maxWidth: 120 }}>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>{item.value}</div>
                    <div
                      title={item.isActive ? `${item.name}: ${item.value}` : `${item.name} — Inativo — 0 participações`}
                      style={{
                        height,
                        minHeight: 4,
                        borderRadius: '8px 8px 0 0',
                        background: item.isActive ? (highlight ? 'var(--danger)' : 'var(--primary)') : 'var(--text-secondary)',
                        opacity: item.isActive ? 1 : 0.55,
                      }}
                    />
                    <div style={{ fontSize: 12, marginTop: 8, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}{item.isActive ? '' : ' (inativo)'}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="muted-text" style={{ marginTop: 10 }}>Média de participações: <strong>{mean.toFixed(1)}</strong></p>
            {hasInactiveMembers ? (
              <p className="muted-text" style={{ marginTop: 8 }}>
                Integrantes inativos aparecem zerados e não entram no cálculo da média.
              </p>
            ) : null}
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
            {alerts.length > 0 || incompleteEvents.length > 0 || dynamicAlerts.length > 0 ? (
              <ul>
                {dynamicAlerts.map((alert, index) => (
                  <li key={`dynamic-${index}`}>{alert}</li>
                ))}
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
