import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { getWeekDay } from '../utils/date';

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

export function SchedulePage() {
  const { schedule, members, alerts, history, generateSchedule, defaultPeriod, updateScheduleMembers } = useAppState();
  const [startDate, setStartDate] = useState(defaultPeriod.startDate);
  const [endDate, setEndDate] = useState(defaultPeriod.endDate);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [memberSelection, setMemberSelection] = useState<string[]>([]);

  useEffect(() => {
    if (schedule.length === 0) {
      generateSchedule(defaultPeriod.startDate, defaultPeriod.endDate);
    }
  }, [defaultPeriod.endDate, defaultPeriod.startDate, generateSchedule, schedule.length]);

  const monthMatrix = useMemo(() => getMonthMatrix(cursor.year, cursor.month), [cursor]);

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
      map[item.id] = members
        .filter((member) => {
          if (!member.active) return false;
          if (member.eventAvailability.length > 0 && !member.eventAvailability.includes(item.eventRuleId)) return false;
          return true;
        })
        .map((member) => member.id);
    });
    return map;
  }, [members, schedule]);

  const openPrev = () => setCursor((c) => {
    const d = new Date(c.year, c.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const openNext = () => setCursor((c) => {
    const d = new Date(c.year, c.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const namesForEvent = (memberIds: string[]) => memberIds.map((id) => members.find((m) => m.id === id)?.nickname || members.find((m) => m.id === id)?.name || id);

  const applyManualUpdate = () => {
    if (!editingEventId) return;
    updateScheduleMembers(editingEventId, memberSelection, 'Alteração manual na tela de escala');
    setEditingEventId(null);
    setMemberSelection([]);
  };

  return (
    <div className="container">
      <h1 className="page-title">Escala</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Período da escala</h2>
        <div className="grid-2">
          <label>
            Data inicial
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label>
            Data final
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="button" onClick={() => generateSchedule(startDate, endDate)}>Gerar Escala</button>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Alertas de escala incompleta</h2>
          <ul>
            {alerts.map((alert, idx) => <li key={idx}>{alert}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Lista de eventos escalados</h2>
        <ul>
          {schedule.map((item) => (
            <li key={item.id}>
              {item.date} - {item.time} - {item.eventName} ({item.memberIds.length}/{item.requiredMembers})
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="small-button button" onClick={openPrev}>Anterior</button>
          <button className="small-button button" onClick={openNext}>Próximo</button>
        </div>
        <div className="card">
          <strong>{new Date(cursor.year, cursor.month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} style={{ textAlign: 'center', fontWeight: 700 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {monthMatrix.map((date, idx) => {
            const dateKey = date.toISOString().slice(0, 10);
            const events = eventsByDate[dateKey] ?? [];
            const incomplete = events.some((e) => e.memberIds.length < e.requiredMembers);
            return (
              <div
                key={idx}
                className="card"
                style={{ minHeight: 130, cursor: 'pointer', border: incomplete ? '1px solid #f59e0b' : undefined }}
                onClick={() => setSelectedDate(dateKey)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>{date.getDate()}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{events.length > 0 ? `${events.length} evento(s)` : ''}</div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {events.slice(0, 2).map((ev) => {
                    const names = namesForEvent(ev.memberIds);
                    const firstNames = names.slice(0, 2).join(', ');
                    const extra = names.length > 2 ? ` +${names.length - 2} integrantes` : '';
                    return (
                      <div key={ev.id} style={{ padding: 6, borderRadius: 8, background: '#f8fafc' }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{ev.eventName}</div>
                        <div style={{ fontSize: 12, color: '#475569' }}>{ev.time}</div>
                        <div style={{ fontSize: 12, color: '#1f2937' }}>{firstNames || 'Sem integrantes'}{extra}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate ? (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99 }}
          onClick={() => {
            setSelectedDate(null);
            setEditingEventId(null);
            setMemberSelection([]);
          }}
        >
          <div style={{ width: 760, maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="card">
              <button style={{ float: 'right' }} onClick={() => setSelectedDate(null)}>Fechar</button>
              <h2 style={{ marginTop: 0 }}>Eventos em {selectedDate}</h2>
              {(eventsByDate[selectedDate] ?? []).length === 0 ? <p>Nenhum evento neste dia.</p> : (eventsByDate[selectedDate] ?? []).map((ev) => {
                const names = namesForEvent(ev.memberIds);
                const isEditing = editingEventId === ev.id;
                const eventHistory = history.filter((h) => h.eventDate === ev.date && h.eventTime === ev.time && h.eventName === ev.eventName);
                return (
                  <div key={ev.id} style={{ borderTop: '1px solid #e6eef8', paddingTop: 12, marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{ev.eventName}</strong>
                        <div style={{ color: '#64748b' }}>{getWeekDay(new Date(ev.date))} - {ev.date} - {ev.time}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div>Quantidade necessária: {ev.requiredMembers}</div>
                        <div>Status: {ev.memberIds.length < ev.requiredMembers ? 'Escala incompleta' : ev.status}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <strong>Integrantes:</strong> {names.length > 0 ? names.join(', ') : 'Sem integrantes definidos'}
                    </div>

                    {isEditing ? (
                      <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: '#f8fafc' }}>
                        <p style={{ marginTop: 0 }}>Editar/Trocar integrantes</p>
                        <div style={{ display: 'grid', gap: 6 }}>
                          {(availableMembersByEvent[ev.id] ?? []).map((memberId) => {
                            const checked = memberSelection.includes(memberId);
                            const name = members.find((m) => m.id === memberId)?.nickname || members.find((m) => m.id === memberId)?.name || memberId;
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
                                />
                                {name}
                              </label>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button className="small-button button" onClick={applyManualUpdate}>Salvar edição</button>
                          <button className="small-button button" style={{ background: '#64748b' }} onClick={() => { setEditingEventId(null); setMemberSelection([]); }}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          className="small-button button"
                          onClick={() => {
                            setEditingEventId(ev.id);
                            setMemberSelection(ev.memberIds);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="small-button button"
                          style={{ background: '#0ea5a4' }}
                          onClick={() => {
                            setEditingEventId(ev.id);
                            setMemberSelection(ev.memberIds);
                          }}
                        >
                          Trocar integrante
                        </button>
                      </div>
                    )}

                    <div style={{ marginTop: 10, background: '#f8fafc', borderRadius: 8, padding: 8 }}>
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
