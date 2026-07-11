import { useMemo, useState } from 'react';
import { AlertBanner } from '../components/AlertBanner';
import { SummaryCard } from '../components/SummaryCard';
import { getTeamFunctionLabel } from '../config/moduleFunctions';
import { useAccessControl } from '../hooks/useAccessControl';
import { PrincipalModuleSchedule, usePrincipalDashboard } from '../hooks/usePrincipalDashboard';
import { formatDate } from '../utils/date';
import { buildConsolidatedSchedulePdf } from '../utils/schedulePdf';
import { ScheduleAssignment } from '../utils/scheduleFunctions';

type FilterMode = 'day' | 'week' | 'month' | 'custom';

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

function filterModuleSchedule(moduleData: PrincipalModuleSchedule, startDate: string, endDate: string) {
  return {
    ...moduleData,
    schedule: moduleData.schedule.filter((item) => item.date >= startDate && item.date <= endDate),
  };
}

export function PrincipalDashboardPage() {
  const { logout } = useAccessControl();
  const { modulesData, isLoading, errorMessage, defaultPeriod, refreshData } = usePrincipalDashboard();
  const today = useMemo(() => formatDate(new Date()), []);
  const [filterMode, setFilterMode] = useState<FilterMode>('month');
  const [selectedDay, setSelectedDay] = useState(today);
  const [selectedWeekAnchor, setSelectedWeekAnchor] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [customStartDate, setCustomStartDate] = useState(defaultPeriod.startDate);
  const [customEndDate, setCustomEndDate] = useState(defaultPeriod.endDate);

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

    return {
      startDate: customStartDate,
      endDate: customEndDate,
      label: `${formatBrDate(customStartDate)} a ${formatBrDate(customEndDate)}`,
    };
  }, [customEndDate, customStartDate, filterMode, selectedDay, selectedMonth, selectedWeekAnchor]);

  const filteredModules = useMemo(
    () => modulesData.map((moduleData) => filterModuleSchedule(moduleData, selectedPeriod.startDate, selectedPeriod.endDate)),
    [modulesData, selectedPeriod.endDate, selectedPeriod.startDate]
  );

  const groupedAssignments = useMemo(
    () => filteredModules.map((moduleData) => ({
      moduleId: moduleData.moduleId,
      moduleLabel: moduleData.moduleLabel,
      rows: moduleData.schedule.flatMap((item) => {
        const assignments: ScheduleAssignment[] = item.memberAssignments && item.memberAssignments.length > 0
          ? item.memberAssignments
          : item.memberIds.map((memberId) => ({ memberId }));

        return assignments.map((assignment) => {
          const member = moduleData.members.find((candidate) => candidate.id === assignment.memberId);
          return {
            scheduleId: item.id,
            memberId: assignment.memberId,
            date: item.date,
            time: item.time,
            eventName: item.eventName,
            memberName: member?.nickname || member?.name || assignment.memberId,
            functionLabel: assignment.functionKey ? getTeamFunctionLabel(assignment.functionKey) : '-',
          };
        });
      }),
    })),
    [filteredModules]
  );

  const summary = useMemo(() => {
    const uniqueScheduledMembers = new Set<string>();
    groupedAssignments.forEach((group) => {
      group.rows.forEach((row) => uniqueScheduledMembers.add(`${group.moduleId}:${row.memberId}`));
    });

    const teamsStatus = filteredModules.map((moduleData) => {
      const incompleteEvents = moduleData.schedule.filter((item) => item.memberIds.length < item.requiredMembers);
      return {
        moduleId: moduleData.moduleId,
        moduleLabel: moduleData.moduleLabel,
        hasEvents: moduleData.schedule.length > 0,
        incompleteEvents,
      };
    });

    const completeTeams = teamsStatus.filter((item) => item.hasEvents && item.incompleteEvents.length === 0).length;
    const incompleteTeams = teamsStatus.filter((item) => item.incompleteEvents.length > 0).length;
    const teamsWithoutEvents = teamsStatus.filter((item) => !item.hasEvents).length;
    const alerts = teamsStatus.flatMap((item) =>
      item.incompleteEvents.map((event) => `${item.moduleLabel}: ${event.date} ${event.time} - ${event.eventName} (${event.memberIds.length}/${event.requiredMembers})`)
    );

    return {
      totalPeople: uniqueScheduledMembers.size,
      totalAssignments: groupedAssignments.reduce((sum, group) => sum + group.rows.length, 0),
      completeTeams,
      incompleteTeams,
      teamsWithoutEvents,
      alerts,
    };
  }, [filteredModules, groupedAssignments]);

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

  return (
    <div className="container">
      <main className="page-content">
        <section className="page-section">
          <div className="card" style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <h1 className="page-title" style={{ marginTop: 0, textAlign: 'left' }}>Dashboard Principal</h1>
                <p className="muted-text" style={{ marginBottom: 0 }}>
                  Consolidação somente leitura das escalas de Diaconia, Recepção, Mídias, Louvor, Cozinha e EBD.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="button secondary" onClick={() => void refreshData()}>
                  Atualizar dados
                </button>
                <button type="button" className="button" onClick={handleExportReport} disabled={isLoading}>
                  Gerar relatório geral
                </button>
                <button type="button" className="button secondary" onClick={() => void logout()}>
                  Sair
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
          <div className="grid-3">
            <SummaryCard
              title="Pessoas escaladas"
              value={String(summary.totalPeople)}
              description={`${summary.totalAssignments} atribuições no período`}
            />
            <SummaryCard
              title="Equipes completas"
              value={String(summary.completeTeams)}
              description={summary.teamsWithoutEvents > 0 ? `${summary.teamsWithoutEvents} sem eventos no período` : 'Sem lacunas no período'}
            />
            <SummaryCard
              title="Equipes incompletas"
              value={String(summary.incompleteTeams)}
              description={`${summary.alerts.length} alerta(s) de cobertura insuficiente`}
            />
          </div>
        </section>

        <section className="page-section">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Alertas globais</h2>
            {isLoading ? <p>Carregando alertas...</p> : summary.alerts.length === 0 ? <p>Nenhum evento incompleto no período selecionado.</p> : (
              <ul>
                {summary.alerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="page-section">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Escalas consolidadas por equipe</h2>
            <p className="muted-text">Somente leitura. Esta área não permite editar integrantes, eventos ou escalas de outros módulos.</p>

            {isLoading ? <p>Carregando escalas...</p> : groupedAssignments.map((group) => (
              <div key={group.moduleId} style={{ marginTop: 18 }}>
                <h3 style={{ marginBottom: 10 }}>{group.moduleLabel}</h3>
                {group.rows.length === 0 ? (
                  <p className="muted-text">Nenhuma pessoa escalada neste período.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="table responsive-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Horário</th>
                          <th>Evento</th>
                          <th>Integrante</th>
                          <th>Função</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr key={`${row.scheduleId}-${row.memberId}-${row.functionLabel}`}>
                            <td data-label="Data">{formatBrDate(row.date)}</td>
                            <td data-label="Horário">{row.time}</td>
                            <td data-label="Evento">{row.eventName}</td>
                            <td data-label="Integrante">{row.memberName}</td>
                            <td data-label="Função">{row.functionLabel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}