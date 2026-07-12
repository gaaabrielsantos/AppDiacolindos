import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { getWeekDay } from '../utils/date';
import { useAccessControl } from '../hooks/useAccessControl';
import { VIEWER_BLOCK_MESSAGE } from '../utils/access';
import { buildAssignmentsFromSelectedMembers, formatScheduleMembers, memberHasFunction } from '../utils/scheduleFunctions';
import { getTeamFunctionLabel } from '../config/moduleFunctions';

function getMonthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const matrix: Date[] = [];
  const startDay = first.getDay();
  for (let i = 0; i < startDay; i += 1) {
    matrix.push(new Date(year, month, i - startDay + 1));
  }
  for (let d = 1; d <= last.getDate(); d += 1) matrix.push(new Date(year, month, d));
  while (matrix.length % 7 !== 0) matrix.push(new Date(year, month, last.getDate() + (matrix.length % 7)));
  return matrix;
}

function formatBrDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function SchedulePage() {
  const { isAdmin } = useAccessControl();
  const { moduleId, schedule, members, eventRules, alerts, history, generateSchedule, defaultPeriod, updateScheduleMembers } = useAppState();
  const [startDate, setStartDate] = useState(defaultPeriod.startDate);
  const [endDate, setEndDate] = useState(defaultPeriod.endDate);
  const [rangeStart, setRangeStart] = useState(defaultPeriod.startDate);
  const [rangeEnd, setRangeEnd] = useState(defaultPeriod.endDate);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  const [periodCursor, setPeriodCursor] = useState(() => {
    const base = new Date(defaultPeriod.startDate);
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [memberSelection, setMemberSelection] = useState<string[]>([]);

  useEffect(() => {
    if (schedule.length === 0) {
      void generateSchedule(defaultPeriod.startDate, defaultPeriod.endDate);
    }
  }, [defaultPeriod.endDate, defaultPeriod.startDate, generateSchedule, schedule.length]);

  const monthMatrix = useMemo(() => getMonthMatrix(cursor.year, cursor.month), [cursor]);
  const periodMatrix = useMemo(() => getMonthMatrix(periodCursor.year, periodCursor.month), [periodCursor]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof schedule> = {};
    schedule.forEach((s) => {
      map[s.date] = map[s.date] ?? [];
      map[s.date].push(s);
    });
    return map;
  }, [schedule]);

  const availableMembersByEvent = useMemo(() => {
    const map: Record<string, string[]> = {};
    schedule.forEach((item) => {
      const sourceRule = eventRules.find((eventRule) => eventRule.id === item.eventRuleId);
      const requiredFunctions = new Set((sourceRule?.roleRequirements ?? []).map((requirement) => requirement.functionKey));
      map[item.id] = members
        .filter((member) => {
          if (!member.active) return false;
          if (!member.unavailability || member.unavailability.length === 0) return true;
          const isUnavailable = member.unavailability.some((u) => {
            if (u.type === 'evento' && u.eventId === item.eventRuleId) return true;
            if (u.type === 'data' && u.date === item.date) return true;
            if (u.type === 'periodo' && u.from && u.to) return item.date >= u.from && item.date <= u.to;
            return false;
          });
          if (isUnavailable) return false;
          if (requiredFunctions.size === 0) return true;
          return Array.from(requiredFunctions).some((functionKey) => memberHasFunction(member, functionKey));
        })
        .map((member) => member.id);
    });
    return map;
  }, [eventRules, members, schedule]);

  const openPrev = () => setCursor((c) => {
    const d = new Date(c.year, c.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const openNext = () => setCursor((c) => {
    const d = new Date(c.year, c.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const namesForEvent = (item: typeof schedule[number]) => formatScheduleMembers(item, members);

  const periodLabel = rangeStart && rangeEnd
    ? `${formatBrDate(rangeStart)} até ${formatBrDate(rangeEnd)}`
    : 'Selecionar início e término da escala';

  const openPeriodPrev = () => setPeriodCursor((current) => {
    const d = new Date(current.year, current.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const openPeriodNext = () => setPeriodCursor((current) => {
    const d = new Date(current.year, current.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const pickPeriodDate = (dateValue: string) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dateValue);
      setRangeEnd('');
      return;
    }

    if (dateValue < rangeStart) {
      setRangeEnd(rangeStart);
      setRangeStart(dateValue);
      setStartDate(dateValue);
      setEndDate(rangeStart);
      setPeriodPickerOpen(false);
      return;
    }

    setRangeEnd(dateValue);
    setStartDate(rangeStart);
    setEndDate(dateValue);
    setPeriodPickerOpen(false);
  };

  const isRangeStart = (dateValue: string) => rangeStart === dateValue;
  const isRangeEnd = (dateValue: string) => rangeEnd === dateValue;
  const isInRange = (dateValue: string) => Boolean(rangeStart && rangeEnd && dateValue > rangeStart && dateValue < rangeEnd);

  const handleGenerateSchedule = async () => {
    if (!isAdmin) {
      alert(VIEWER_BLOCK_MESSAGE);
      return;
    }
    if (!rangeStart || !rangeEnd) {
      alert('Selecione a data inicial e a data final da escala antes de gerar.');
      return;
    }

    setStartDate(rangeStart);
    setEndDate(rangeEnd);
    await generateSchedule(rangeStart, rangeEnd);
  };

  const applyManualUpdate = async () => {
    if (!isAdmin) {
      alert(VIEWER_BLOCK_MESSAGE);
      return;
    }
    if (!editingEventId) return;
    const scheduleItem = schedule.find((item) => item.id === editingEventId);
    const eventRule = scheduleItem ? eventRules.find((item) => item.id === scheduleItem.eventRuleId) : null;
    const nextAssignments = scheduleItem && eventRule
      ? buildAssignmentsFromSelectedMembers(eventRule, memberSelection, members, scheduleItem.memberAssignments ?? [])
      : undefined;
    const wasUpdated = await updateScheduleMembers(editingEventId, memberSelection, 'Alteração manual na tela de escala', nextAssignments);
    if (!wasUpdated) return;
    setEditingEventId(null);
    setMemberSelection([]);
  };

  const startEventEdit = (eventId: string, memberIds: string[], date: string) => {
    if (!isAdmin) {
      alert(VIEWER_BLOCK_MESSAGE);
      return;
    }
    setSelectedDate(date);
    setEditingEventId(eventId);
    setMemberSelection(memberIds);
  };

  return (
    <div className="container">
      <main className="page-content">
        <section className="page-section">
          <h1 className="page-title">Escala</h1>
        </section>

        <section className="page-section">
          <div className="card" style={{ maxWidth: 760, margin: '0 auto' }}>
            <h2 style={{ marginTop: 0, textAlign: 'center', textTransform: 'uppercase' }}>Período da escala</h2>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <button className="button secondary" onClick={() => setPeriodPickerOpen((current) => !current)}>
                {periodLabel}
              </button>
            </div>
            {periodPickerOpen ? (
              <div className="card" style={{ marginTop: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <button className="small-button button secondary" onClick={openPeriodPrev}>Anterior</button>
                  <strong>{new Date(periodCursor.year, periodCursor.month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</strong>
                  <button className="small-button button secondary" onClick={openPeriodNext}>Próximo</button>
                </div>
                <div className="calendar-wrapper">
                  <div className="calendar-weekdays" style={{ marginBottom: 8 }}>
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                      <div key={d} style={{ textAlign: 'center', fontWeight: 700 }}>{d}</div>
                    ))}
                  </div>
                  <div className="calendar-grid">
                    {periodMatrix.map((date, idx) => {
                      const dateValue = date.toISOString().slice(0, 10);
                      const isStart = isRangeStart(dateValue);
                      const isEnd = isRangeEnd(dateValue);
                      const inRange = isInRange(dateValue);
                      const outsideMonth = date.getMonth() !== periodCursor.month;

                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`small-button button secondary calendar-day ${outsideMonth ? 'outside-month' : ''} ${inRange ? 'in-range' : ''} ${isStart || isEnd ? 'selected' : ''}`}
                          style={{ fontWeight: isStart || isEnd ? 700 : 500 }}
                          onClick={() => pickPeriodDate(dateValue)}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
            {isAdmin ? (
              <div className="form-actions" style={{ justifyContent: 'center', marginTop: 12 }}>
                <button
                  className="button"
                  onClick={() => void handleGenerateSchedule()}
                >
                  Gerar Escala
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {alerts.length > 0 ? (
          <section className="page-section">
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Alertas de escala incompleta</h2>
              <ul>
                {alerts.map((alert, idx) => <li key={idx}>{alert}</li>)}
              </ul>
            </div>
          </section>
        ) : null}

        <section className="page-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="small-button button" onClick={openPrev}>Anterior</button>
              <button className="small-button button" onClick={openNext}>Próximo</button>
            </div>
            <div id="escala-mes-ano-card" className="card">
              <strong>{new Date(cursor.year, cursor.month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</strong>
            </div>
          </div>
        </section>

        <section className="page-section">
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="calendar-wrapper">
              <div className="calendar-weekdays">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                  <div key={d} style={{ textAlign: 'center', fontWeight: 700 }}>{d}</div>
                ))}
              </div>
              <div className="calendar-grid">
                {monthMatrix.map((date, idx) => {
                  const dateKey = date.toISOString().slice(0, 10);
                  const events = eventsByDate[dateKey] ?? [];
                  const incomplete = events.some((e) => e.memberIds.length < e.requiredMembers);
                  return (
                    <div
                      key={idx}
                      className="card calendar-day-card"
                      style={{ minHeight: 130, cursor: 'pointer', border: incomplete ? '1px solid var(--warning-border)' : undefined }}
                      onClick={() => setSelectedDate(dateKey)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 6 }}>
                        <div style={{ fontWeight: 700 }}>{date.getDate()}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{events.length > 0 ? `${events.length} evento(s)` : ''}</div>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {events.slice(0, 2).map((ev) => {
                          const names = namesForEvent(ev);
                          const firstNames = names.slice(0, 2).join(', ');
                          const extra = names.length > 2 ? ` +${names.length - 2} integrantes` : '';
                          return (
                            <div key={ev.id} style={{ padding: 6, borderRadius: 8, background: 'var(--surface-soft)', overflowWrap: 'anywhere', wordBreak: 'break-word' }} className="scale-event-preview">
                              <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                                <span>{ev.eventName}</span>
                                {isAdmin ? (
                                  <button
                                    type="button"
                                    className="edit-icon-button button secondary small-button"
                                    title="Editar escala"
                                    aria-label="Editar escala"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      startEventEdit(ev.id, ev.memberIds, dateKey);
                                    }}
                                  >
                                    ✎
                                  </button>
                                ) : null}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{ev.time}</div>
                              <div style={{ fontSize: 12, color: 'var(--text)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{firstNames || 'Sem integrantes'}{extra}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {selectedDate ? (
        <div
          className="modal-overlay"
          onClick={() => {
            setSelectedDate(null);
            setEditingEventId(null);
            setMemberSelection([]);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card">
              <button type="button" className="small-button button secondary modal-close-button" onClick={() => setSelectedDate(null)}>Fechar</button>
              <h2 style={{ marginTop: 0 }}>Eventos em {selectedDate}</h2>
              {(eventsByDate[selectedDate] ?? []).length === 0 ? <p>Nenhum evento neste dia.</p> : (eventsByDate[selectedDate] ?? []).map((ev) => {
                const names = namesForEvent(ev);
                const isEditing = editingEventId === ev.id;
                const eventHistory = history.filter((h) => h.eventDate === ev.date && h.eventTime === ev.time && h.eventName === ev.eventName);
                const eventRule = eventRules.find((item) => item.id === ev.eventRuleId);
                return (
                  <div key={ev.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{ev.eventName}</strong>
                        <div style={{ color: 'var(--muted)' }}>{getWeekDay(new Date(ev.date))} - {ev.date} - {ev.time}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div>Quantidade necessária: {ev.requiredMembers}</div>
                        <div>Status: {ev.memberIds.length < ev.requiredMembers ? 'Escala incompleta' : ev.status}</div>
                      </div>
                    </div>

                    {eventRule?.roleRequirements && eventRule.roleRequirements.length > 0 ? (
                      <div style={{ marginTop: 8, color: 'var(--muted)' }}>
                        Funções necessárias: {eventRule.roleRequirements.map((item) => `${getTeamFunctionLabel(item.functionKey)}: ${item.quantity}`).join(', ')}
                      </div>
                    ) : null}

                    <div style={{ marginTop: 10 }}>
                      <strong>Integrantes:</strong> {names.length > 0 ? names.join(', ') : 'Sem integrantes definidos'}
                    </div>

                    {isAdmin && isEditing ? (
                      <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'var(--surface-soft)' }}>
                        <p style={{ marginTop: 0 }}>Editar/Trocar integrantes</p>
                        <div style={{ display: 'grid', gap: 6 }}>
                          {(availableMembersByEvent[ev.id] ?? []).map((memberId) => {
                            const checked = memberSelection.includes(memberId);
                            const member = members.find((m) => m.id === memberId);
                            const name = member?.nickname || member?.name || memberId;
                            const functionsLabel = member?.functions && member.functions.length > 0
                              ? ` - ${member.functions.map(getTeamFunctionLabel).join(', ')}`
                              : '';
                            return (
                              <label key={memberId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setMemberSelection((current) => {
                                      const set = new Set(current);
                                      if (set.has(memberId)) set.delete(memberId); else set.add(memberId);
                                      return Array.from(set).slice(0, ev.requiredMembers);
                                    });
                                  }}
                                  disabled={!isAdmin}
                                  title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                                />
                                {name}{functionsLabel}
                              </label>
                            );
                          })}
                        </div>
                        <div className="form-actions" style={{ marginTop: 10 }}>
                          <button
                            className="small-button button"
                            onClick={() => void applyManualUpdate()}
                            disabled={!isAdmin}
                            title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                          >
                            Salvar edição
                          </button>
                          <button className="small-button button secondary" onClick={() => { setEditingEventId(null); setMemberSelection([]); }}>Cancelar</button>
                        </div>
                      </div>
                    ) : isAdmin ? (
                      <div className="form-actions" style={{ marginTop: 10 }}>
                        <button
                          className="small-button button"
                          onClick={() => {
                            setEditingEventId(ev.id);
                            setMemberSelection(ev.memberIds);
                          }}
                          disabled={!isAdmin}
                          title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                        >
                          Editar
                        </button>
                        <button
                          className="small-button button success"
                          onClick={() => {
                            setEditingEventId(ev.id);
                            setMemberSelection(ev.memberIds);
                          }}
                          disabled={!isAdmin}
                          title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                        >
                          Trocar integrante
                        </button>
                      </div>
                    ) : null}

                    <div style={{ marginTop: 10, background: 'var(--surface-soft)', borderRadius: 8, padding: 8 }}>
                      <strong>Histórico de alterações do evento</strong>
                      {eventHistory.length === 0 ? (
                        <p style={{ margin: '8px 0 0' }}>Nenhuma alteração registrada para este evento.</p>
                      ) : (
                        <ul style={{ margin: '8px 0 0' }}>
                          {eventHistory.map((item) => (
                            <li key={item.id}>
                              {new Date(item.changedAt).toLocaleString('pt-BR')} - {item.originalMemberId || '-'} para {item.substituteMemberId || '-'} ({item.reason || 'sem motivo'})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
