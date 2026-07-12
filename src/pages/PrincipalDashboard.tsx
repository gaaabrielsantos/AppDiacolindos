import { useEffect, useMemo, useState } from 'react';
import { AlertBanner } from '../components/AlertBanner';
import { getTeamFunctionLabel } from '../config/moduleFunctions';
import { useAccessControl } from '../hooks/useAccessControl';
import { PrincipalModuleSchedule, usePrincipalDashboard } from '../hooks/usePrincipalDashboard';
import { formatDate } from '../utils/date';
import { buildConsolidatedSchedulePdf } from '../utils/schedulePdf';
import { ScheduleAssignment } from '../utils/scheduleFunctions';
import logoCompletoBranco from '../assets/logo-completo-branco.png';
import logoCompleto from '../assets/logo-completo.png';

type ConsolidatedMember = {
  id: string;
  name: string;
  functionLabel: string | null;
};

type ConsolidatedEntry = {
  scheduleId: string;
  date: string;
  time: string;
  eventName: string;
  members: ConsolidatedMember[];
  requiredMembers: number;
  assignedCount: number;
  missingCount: number;
  statusText: string;
  isIncomplete: boolean;
};

type ConsolidatedSection = {
  moduleId: string;
  moduleLabel: string;
  entries: ConsolidatedEntry[];
  incompleteEntries: number;
};

function formatBrDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function normalizeRange(startDate: string, endDate: string) {
  if (!startDate || !endDate || startDate <= endDate) {
    return { startDate, endDate };
  }

  return {
    startDate: endDate,
    endDate: startDate,
  };
}

function filterModuleSchedule(moduleData: PrincipalModuleSchedule, startDate: string, endDate: string) {
  return {
    ...moduleData,
    schedule: moduleData.schedule.filter((item) => item.date >= startDate && item.date <= endDate),
  };
}

export function PrincipalDashboardPage({ onOpenLogin }: { onOpenLogin: () => void }) {
  const { accessMode, isAuthenticated, logout } = useAccessControl();
  const { modulesData, isLoading, errorMessage, defaultPeriod, refreshData } = usePrincipalDashboard();
  const today = useMemo(() => formatDate(new Date()), []);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [customStartDate, setCustomStartDate] = useState(defaultPeriod.startDate);
  const [customEndDate, setCustomEndDate] = useState(defaultPeriod.endDate);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('diacolindos-theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const logoSrc = theme === 'dark' ? logoCompletoBranco : logoCompleto;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('diacolindos-theme', theme);
  }, [theme]);

  const selectedPeriod = useMemo(() => {
    const normalizedCustomRange = normalizeRange(customStartDate, customEndDate);

    return {
      startDate: normalizedCustomRange.startDate,
      endDate: normalizedCustomRange.endDate,
      label: `${formatBrDate(normalizedCustomRange.startDate)} a ${formatBrDate(normalizedCustomRange.endDate)}`,
    };
  }, [customEndDate, customStartDate]);

  const filteredModules = useMemo(
    () => modulesData.map((moduleData) => filterModuleSchedule(moduleData, selectedPeriod.startDate, selectedPeriod.endDate)),
    [modulesData, selectedPeriod.endDate, selectedPeriod.startDate]
  );

  const consolidatedSections = useMemo<ConsolidatedSection[]>(
    () => filteredModules.map((moduleData) => {
      const entries = moduleData.schedule.map((item) => {
        const assignments: ScheduleAssignment[] = item.memberAssignments && item.memberAssignments.length > 0
          ? item.memberAssignments
          : item.memberIds.map((memberId) => ({ memberId }));
        const members = assignments.map((assignment) => {
          const member = moduleData.members.find((candidate) => candidate.id === assignment.memberId);

          return {
            id: assignment.memberId,
            name: member?.nickname || member?.name || assignment.memberId,
            functionLabel: assignment.functionKey ? getTeamFunctionLabel(assignment.functionKey) : null,
          };
        });
        const assignedCount = members.length;
        const missingCount = Math.max(item.requiredMembers - assignedCount, 0);

        return {
          scheduleId: item.id,
          date: item.date,
          time: item.time,
          eventName: item.eventName,
          members,
          requiredMembers: item.requiredMembers,
          assignedCount,
          missingCount,
          statusText: missingCount > 0
            ? `Escala incompleta (${assignedCount}/${item.requiredMembers})`
            : `Escala completa (${assignedCount}/${item.requiredMembers})`,
          isIncomplete: missingCount > 0,
        };
      });

      return {
        moduleId: moduleData.moduleId,
        moduleLabel: moduleData.moduleLabel,
        entries,
        incompleteEntries: entries.filter((entry) => entry.isIncomplete).length,
      };
    }),
    [filteredModules]
  );

  const allEntries = useMemo(
    () => consolidatedSections.flatMap((section) => section.entries.map((entry) => ({
      ...entry,
      moduleId: section.moduleId,
      moduleLabel: section.moduleLabel,
    }))),
    [consolidatedSections]
  );

  const summary = useMemo(() => {
    const uniqueScheduledMembers = new Set<string>();
    allEntries.forEach((entry) => {
      entry.members.forEach((member) => uniqueScheduledMembers.add(`${entry.moduleId}:${member.id}`));
    });

    const completeTeams = consolidatedSections.filter((section) => section.entries.length > 0 && section.incompleteEntries === 0).length;
    const incompleteTeams = consolidatedSections.filter((section) => section.incompleteEntries > 0).length;
    const teamsWithoutEvents = consolidatedSections.filter((section) => section.entries.length === 0).length;
    const upcomingEntries = allEntries
      .filter((entry) => entry.date >= today)
      .sort((left, right) => {
        const dateDiff = left.date.localeCompare(right.date);
        if (dateDiff !== 0) return dateDiff;
        return left.time.localeCompare(right.time);
      });
    const nextEvent = upcomingEntries[0];
    const alerts = consolidatedSections.flatMap((section) =>
      section.entries
        .filter((entry) => entry.isIncomplete)
        .map((entry) => `${section.moduleLabel}: ${formatBrDate(entry.date)} ${entry.time} - ${entry.eventName} (${entry.assignedCount}/${entry.requiredMembers})`)
    );

    return {
      totalPeople: uniqueScheduledMembers.size,
      totalAssignments: allEntries.reduce((sum, entry) => sum + entry.members.length, 0),
      completeTeams,
      incompleteTeams,
      teamsWithoutEvents,
      upcomingEvents: upcomingEntries.length,
      nextEventLabel: nextEvent
        ? `${nextEvent.moduleLabel}: ${formatBrDate(nextEvent.date)} ${nextEvent.time} - ${nextEvent.eventName}`
        : 'Nenhum próximo evento dentro do período selecionado.',
      alerts,
    };
  }, [allEntries, consolidatedSections, today]);

  const hasAnySchedule = allEntries.length > 0;

  const moduleChartData = useMemo(
    () => consolidatedSections
      .map((section) => ({
        id: section.moduleId,
        label: section.moduleLabel,
        value: section.entries.reduce((sum, entry) => sum + entry.assignedCount, 0),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })),
    [consolidatedSections]
  );

  const maxModuleChartValue = Math.max(...moduleChartData.map((item) => item.value), 1);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  const handleExportReport = () => {
    const { doc, fileName } = buildConsolidatedSchedulePdf(
      filteredModules.map((moduleData) => ({
        moduleId: moduleData.moduleId,
        members: moduleData.members,
        schedule: moduleData.schedule,
      })),
      selectedPeriod.label
    );
    doc.save(fileName);
  };

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="container">
      <main className="page-content">
        <section className="page-section">
          <div className="card principal-dashboard-header-card" style={{ display: 'grid', gap: 16, textAlign: 'center' }}>
            <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
              <img src={logoSrc} alt="IPB Mairinque" style={{ width: 250, height: 'auto', display: 'block' }} />
              <p className="muted-text" style={{ marginBottom: 0, maxWidth: 760 }}>
                Consolidação somente leitura das escalas da IPB Mairinque por Diaconia, Recepção, Mídias, Louvor, Cozinha e EBD.
              </p>
            </div>
            <div className="principal-header-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  if (isAuthenticated) {
                    void logout();
                    return;
                  }
                  onOpenLogin();
                }}
              >
                Administrador principal
              </button>
              <button type="button" className="button secondary" onClick={() => void refreshData()} disabled={isLoading}>
                {isLoading ? 'Atualizando...' : 'Atualizar dados'}
              </button>
              <button type="button" className="button" onClick={handleExportReport} disabled={isLoading}>
                Gerar relatório geral
              </button>
              <button
                type="button"
                className="small-button button secondary principal-theme-toggle"
                onClick={toggleTheme}
                title={theme === 'light' ? 'Ativar modo noturno' : 'Ativar modo claro'}
                aria-label={theme === 'light' ? 'Ativar modo noturno' : 'Ativar modo claro'}
              >
                <span className={`theme-switch ${theme === 'dark' ? 'dark' : ''}`} aria-hidden>
                  <span className="theme-switch-thumb">{theme === 'light' ? '🌙' : '☀️'}</span>
                </span>
              </button>
            </div>

            <div className="principal-filter-group" style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 14, justifyContent: 'center' }} />
          </div>
        </section>

        {errorMessage ? (
          <section className="page-section">
            <AlertBanner message={errorMessage} />
          </section>
        ) : null}

        {false ? (
          <section className="page-section">
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Pessoas escaladas por equipe</h2>
              <p className="muted-text">Comparação visual do total de integrantes escalados por módulo no período selecionado.</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, minHeight: 220, paddingTop: 16, flexWrap: 'wrap' }}>
                {moduleChartData.map((item) => {
                  const height = `${(item.value / maxModuleChartValue) * 180}px`;
                  return (
                    <div key={item.id} style={{ flex: '1 1 96px', minWidth: 96, textAlign: 'center', maxWidth: 160 }}>
                      <div style={{ fontSize: 12, marginBottom: 6 }}>{item.value}</div>
                      <div
                        title={`${item.label}: ${item.value}`}
                        style={{
                          height,
                          minHeight: 4,
                          borderRadius: '8px 8px 0 0',
                          background: 'var(--primary)',
                        }}
                      />
                      <div style={{ fontSize: 12, marginTop: 8, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="muted-text" style={{ marginTop: 12, marginBottom: 0 }}>
                Pessoas escaladas: <strong>{summary.totalPeople}</strong> | Atribuições: <strong>{summary.totalAssignments}</strong> | Seções completas: <strong>{summary.completeTeams}</strong> | Seções incompletas: <strong>{summary.incompleteTeams}</strong> | Seções sem escala: <strong>{summary.teamsWithoutEvents}</strong>
              </p>
              <p className="muted-text" style={{ marginTop: 8 }}>
                Período em análise: <strong>{selectedPeriod.label}</strong>. {hasAnySchedule ? 'A visualização está consolidada por seção, data, horário, evento e integrantes.' : 'Nenhuma escala consolidada disponível para o filtro atual.'}
              </p>
            </div>
          </section>
        ) : null}

        <section className="page-section">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Escalas consolidadas por seção</h2>
            <p className="muted-text">Somente leitura. Esta área não permite editar integrantes, eventos ou escalas de outros módulos.</p>

            {isLoading ? <p>Carregando escalas...</p> : !hasAnySchedule ? (
              <div className="principal-empty-state">
                <p style={{ margin: 0 }}>Nenhuma escala encontrada para o período selecionado.</p>
              </div>
            ) : null}

            <div className="principal-section-list">
              {consolidatedSections.map((section) => (
                <section key={section.moduleId} className="principal-section-card">
                  <button
                    type="button"
                    className="principal-section-toggle button secondary"
                    onClick={() => toggleSection(section.moduleId)}
                    aria-expanded={expandedSections[section.moduleId] ? 'true' : 'false'}
                  >
                    <div className="principal-section-toggle-main">
                      <span className="principal-section-toggle-icon">{expandedSections[section.moduleId] ? '−' : '+'}</span>
                      <div>
                        <h3 style={{ margin: 0 }}>{section.moduleLabel}</h3>
                        <p className="muted-text" style={{ margin: '6px 0 0' }}>
                          {section.entries.length} evento(s) no período
                        </p>
                      </div>
                    </div>
                    <span className={`principal-status-pill ${section.incompleteEntries > 0 ? 'is-warning' : section.entries.length === 0 ? 'is-muted' : 'is-success'}`}>
                      {section.entries.length === 0
                        ? 'Sem escala no período'
                        : section.incompleteEntries > 0
                          ? `${section.incompleteEntries} escala(s) incompleta(s)`
                          : 'Escalas completas'}
                    </span>
                  </button>

                  <div className={`principal-section-body ${expandedSections[section.moduleId] ? 'is-open' : ''}`}>
                    <div className="principal-section-body-inner">
                      {section.entries.length === 0 ? (
                        <p className="muted-text" style={{ margin: 0 }}>
                          {`Nenhuma escala encontrada para ${section.moduleLabel} neste período.`}
                        </p>
                      ) : (
                        <div className="principal-entry-list">
                          {section.entries.map((entry) => (
                            <article key={entry.scheduleId} className="principal-entry-card">
                              <div className="principal-entry-top">
                                <div>
                                  <p className="principal-eyebrow">Data</p>
                                  <strong>{formatBrDate(entry.date)}</strong>
                                </div>
                                <span className={`principal-status-pill ${entry.isIncomplete ? 'is-warning' : 'is-success'}`}>
                                  {entry.statusText}
                                </span>
                              </div>

                              <div className="principal-entry-meta">
                                <div>
                                  <p className="principal-eyebrow">Horário</p>
                                  <strong>{entry.time}</strong>
                                </div>
                                <div>
                                  <p className="principal-eyebrow">Evento</p>
                                  <strong>{entry.eventName}</strong>
                                </div>
                              </div>

                              <div>
                                <p className="principal-eyebrow">Integrantes escalados</p>
                                {entry.members.length === 0 ? (
                                  <p className="muted-text" style={{ margin: 0 }}>Nenhum integrante escalado.</p>
                                ) : (
                                  <ul className="principal-member-list">
                                    {entry.members.map((member) => (
                                      <li key={`${entry.scheduleId}-${member.id}`} className="principal-member-item">
                                        <span>{member.name}</span>
                                        {member.functionLabel ? <span className="principal-member-function">{member.functionLabel}</span> : null}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              {entry.missingCount > 0 ? (
                                <p className="muted-text" style={{ margin: 0 }}>
                                  Faltam {entry.missingCount} integrante(s) para completar esta escala.
                                </p>
                              ) : null}
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Alertas globais</h2>
            {isLoading ? <p>Carregando alertas...</p> : summary.alerts.length === 0 ? <p>Nenhuma escala incompleta no período selecionado.</p> : (
              <ul className="principal-inline-list">
                {summary.alerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}