import { useState } from 'react';
import { EventRule, WeekDay } from '../types';
import { useAppState } from '../hooks/useAppState';

const weekdays: WeekDay[] = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

export function EventsPage() {
  const { eventRules, setEventRules } = useAppState();
  const [form, setForm] = useState<Partial<EventRule>>({
    name: '',
    weekday: 'domingo',
    time: '09:00',
    recurrence: 'semanal',
    requiredMembers: 1,
  });

  const handleCreate = () => {
    if (!form.name || !form.weekday || !form.recurrence || !form.time || !form.requiredMembers || form.requiredMembers < 1) return;
    const eventToCreate: EventRule = {
      id: `event-${crypto.randomUUID()}`,
      name: form.name,
      weekday: form.weekday,
      time: form.time,
      recurrence: form.recurrence,
      dayOfMonth: form.dayOfMonth,
      requiredMembers: form.requiredMembers,
      notes: form.notes,
    };
    setEventRules((current) => [
      ...current,
      eventToCreate,
    ]);
    setForm({ name: '', weekday: 'domingo', time: '09:00', recurrence: 'semanal', requiredMembers: 1 });
  };

  const removeEvent = (id: string) => {
    setEventRules((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="container">
      <h1 className="page-title">Configuração de eventos</h1>
      <div className="grid-2">
        <div className="card">
          <h2>Adicionar evento</h2>
          <div className="input-group">
            <label>
              Nome do evento
              <input value={form.name ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </label>
            <label>
              Dia da semana
              <select value={form.weekday} onChange={(event) => setForm((prev) => ({ ...prev, weekday: event.target.value as WeekDay }))}>
                {weekdays.map((weekday) => (
                  <option key={weekday} value={weekday}>{weekday}</option>
                ))}
              </select>
            </label>
            <label>
              Horário
              <input type="time" value={form.time ?? '09:00'} onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))} />
            </label>
            <label>
              Recorrência
              <select value={form.recurrence} onChange={(event) => setForm((prev) => ({ ...prev, recurrence: event.target.value as EventRule['recurrence'] }))}>
                <option value="semanal">Toda semana</option>
                <option value="mensal">Mensal</option>
              </select>
            </label>
            {form.recurrence === 'mensal' ? (
              <label>
                Dia do mês
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dayOfMonth ?? 1}
                  onChange={(event) => setForm((prev) => ({ ...prev, dayOfMonth: Number(event.target.value) }))}
                />
              </label>
            ) : null}
            <label>
              Quantidade de integrantes necessários (obrigatório)
              <input
                type="number"
                min={1}
                value={form.requiredMembers ?? 1}
                onChange={(event) => setForm((prev) => ({ ...prev, requiredMembers: Number(event.target.value) }))}
              />
            </label>
            <label>
              Observações
              <textarea rows={3} value={form.notes ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </label>
            <button className="button" onClick={handleCreate}>Salvar evento</button>
          </div>
        </div>
        <div className="card">
          <h2>Visão geral</h2>
          <p style={{ color: '#475569' }}>Defina os dias e horários dos eventos e quantos integrantes cada evento precisa.</p>
          <p><strong>{eventRules.length}</strong> eventos cadastrados</p>
        </div>
      </div>

      <div className="card">
        <h2>Eventos configurados</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Dia/hora</th>
              <th>Recorrência</th>
              <th>Qtd. necessária</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {eventRules.map((rule) => (
              <tr key={rule.id}>
                <td>{rule.name}</td>
                <td>{rule.weekday} - {rule.time}</td>
                <td>{rule.recurrence}{rule.dayOfMonth ? ` (${rule.dayOfMonth})` : ''}</td>
                <td>{rule.requiredMembers}</td>
                <td>
                  <button className="small-button button" style={{ background: '#dc2626' }} onClick={() => removeEvent(rule.id)}>
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
