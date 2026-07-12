import { useEffect, useMemo, useState } from 'react';
import { AlertBanner } from '../components/AlertBanner';
import { getTeamFunctionLabel } from '../config/moduleFunctions';
import { useAccessControl } from '../hooks/useAccessControl';
import { PrincipalModuleSchedule, usePrincipalDashboard } from '../hooks/usePrincipalDashboard';
import { formatDate } from '../utils/date';
import { buildConsolidatedSchedulePdf } from '../utils/schedulePdf';
import { ScheduleAssignment } from '../utils/scheduleFunctions';

type FilterMode = 'day' | 'week' | 'month' | 'custom';

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

function formatMonthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

function getWeekRange(anchor: string) {
  const base = new Date(`${anchor}T12:00:00`);
  const start = new Date(base);
  start.setDate(base.getDate() - base.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
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
  const [filterMode, setFilterMode] = useState<FilterMode>('month');
  const [selectedDay, setSelectedDay] = useState(today);
  const [selectedWeekAnchor, setSelectedWeekAnchor] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [customStartDate, setCustomStartDate] = useState(defaultPeriod.startDate);
  const [customEndDate, setCustomEndDate] = useState(defaultPeriod.endDate);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('diacolindos-theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('diacolindos-theme', theme);
  }, [theme]);

  const selectedPeriod = useMemo(() => {
    if (filterMode === 'day') {
      return {
        startDate: selectedDay,
        endDate: selectedDay,
        label: `Dia ${formatBrDate(selectedDay)}`,
      };
    }

    if (filterMode === 'week') {
      const range = getWeekRange(selectedWeekAnchor);
      return {
        ...range,
        label: `Semana de ${formatBrDate(range.startDate)} a ${formatBrDate(range.endDate)}`,
      };
    }

    if (filterMode === 'month') {
      const range = getMonthRange(selectedMonth);
      return {
        ...range,
        label: formatMonthLabel(selectedMonth),
      };
    }

    const normalizedCustomRange = normalizeRange(customStartDate, customEndDate);

    return {
      startDate: normalizedCustomRange.startDate,
      endDate: normalizedCustomRange.endDate,
      label: `${formatBrDate(normalizedCustomRange.startDate)} a ${formatBrDate(normalizedCustomRange.endDate)}`,
    };
  }, [customEndDate, customStartDate, filterMode, selectedDay, selectedMonth, selectedWeekAnchor]);

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
          <div className="card" style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <h1 className="page-title" style={{ marginTop: 0, textAlign: 'left' }}>Dashboard Principal</h1>
                <p className="muted-text" style={{ marginBottom: 0 }}>
                  Consolidação somente leitura das escalas da IPB Mairinque por Diaconia, Recepção, Mídias, Louvor, Cozinha e EBD.
                </p>
              </div>
              <div className="principal-header-actions">
                <div className="principal-tabs" role="tablist" aria-label="Ações do dashboard principal">
                  <button
                    type="button"
                    className="principal-tab"
                    role="tab"
                    aria-selected="false"
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
                  <button type="button" className="principal-tab" role="tab" aria-selected="false" onClick={() => void refreshData()} disabled={isLoading}>
                    {isLoading ? 'Atualizando...' : 'Atualizar dados'}
                  </button>
                  <button type="button" className="principal-tab" role="tab" aria-selected="false" onClick={handleExportReport} disabled={isLoading}>
                    Gerar relatório geral
                  </button>
                </div>
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
            </div>

            <div className="input-group form-grid">
              <label>
                Tipo de filtro
                <select value={filterMode} onChange={(event) => setFilterMode(event.target.value as FilterMode)}>
                  <option value="day">Dia específico</option>
                  <option value="week">Semana</option>
                  <option value="month">Mês</option>
                  <option value="custom">Intervalo customizado</option>
                </select>
              </label>

              {filterMode === 'day' ? (
                <label>
                  Dia
                  <input type="date" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} />
                </label>
              ) : null}

              {filterMode === 'week' ? (
                <label>
                  Data de referência da semana
                  <input type="date" value={selectedWeekAnchor} onChange={(event) => setSelectedWeekAnchor(event.target.value)} />
                </label>
              ) : null}

              {filterMode === 'month' ? (
                <label>
                  Mês
                  <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
                </label>
              ) : null}

              {filterMode === 'custom' ? (
                <>
                  <label>
                    Data inicial
                    <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} />
                  </label>
                  <label>
                    Data final
                    <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} />
                  </label>
                </>
              ) : null}
            </div>

            <p style={{ margin: 0 }}>
              <strong>Período selecionado:</strong> {selectedPeriod.label}
            </p>
          </div>
        </section>

        {errorMessage ? (
          <section className="page-section">
            <AlertBanner message={errorMessage} />
          </section>
        ) : null}

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

        {false ? (
          <section className="page-section">
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Próximos eventos</h2>
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