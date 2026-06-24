import { useMemo, useState } from 'react';
import { EventRule, WeekDay } from '../types';
import { useAppState } from '../hooks/useAppState';

const weekdays: WeekDay[] = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

type EventType = 'recorrente' | 'especifico';
type EventRecurrence = EventRule['recurrence'];

const emptyForm = (): Partial<EventRule> => ({
  name: '',
  type: 'recorrente',
  active: true,
  date: '',
  weekday: 'domingo',
  time: '09:00',
  recurrence: 'semanal',
  requiredMembers: 1,
});

function formatEventType(type?: EventType) {
  return type === 'especifico' ? 'Específico' : 'Recorrente';
}

function formatRecurrence(rule: EventRule) {
  if (rule.type === 'especifico') return 'Nenhuma';
  if (rule.recurrence === 'nenhuma') return 'Nenhuma';
  if (rule.recurrence === 'semanal') return 'Semanal';
  if (rule.recurrence === 'mensal') return 'Mensal';
  return 'Anual';
}

export function EventsPage() {
  const { eventRules, setEventRules, schedule, updateEventRule } = useAppState();
  const [form, setForm] = useState<Partial<EventRule>>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  const hasGeneratedSchedule = useMemo(() => new Set(schedule.map((item) => item.eventRuleId)), [schedule]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const startEdit = (eventId: string) => {
    const selected = eventRules.find((eventRule) => eventRule.id === eventId);
    if (!selected) return;
    setForm({
      ...selected,
      type: selected.type ?? 'recorrente',
      date: selected.date ?? '',
      recurrence: selected.recurrence ?? 'semanal',
    });
    setEditingId(eventId);
  };

  const applyTypeDefaults = (type: EventType) => {
    setForm((prev) => {
      if (type === 'especifico') {
        return {
          ...prev,
          type,
          recurrence: 'nenhuma',
          weekday: 'domingo',
          dayOfMonth: undefined,
        };
      }

      return {
        ...prev,
        type,
        recurrence: prev.recurrence && prev.recurrence !== 'nenhuma' ? prev.recurrence : 'semanal',
      };
    });
  };

  const applyRecurrence = (recurrence: EventRecurrence) => {
    setForm((prev) => ({
      ...prev,
      recurrence,
      weekday: recurrence === 'semanal' ? (prev.weekday ?? 'domingo') : prev.weekday,
      dayOfMonth: recurrence === 'mensal' ? (prev.dayOfMonth ?? 1) : prev.dayOfMonth,
    }));
  };

  const buildPayload = (): Partial<EventRule> | null => {
    const name = form.name?.trim();
    const type = form.type ?? 'recorrente';
    const recurrence = form.recurrence ?? 'semanal';
    const requiredMembers = Number(form.requiredMembers ?? 0);

    if (!name || !form.time || requiredMembers < 1) {
      alert('Preencha nome, horário e quantidade de integrantes (mínimo 1).');
      return null;
    }

    if (type === 'especifico') {
      if (!form.date) {
        alert('Selecione a data do evento específico no calendário.');
        return null;
      }
      return {
        name,
        type,
        active: form.active ?? true,
        date: form.date,
        weekday: form.weekday ?? 'domingo',
        time: form.time ?? '09:00',
        recurrence: 'nenhuma',
        requiredMembers,
        notes: form.notes,
      };
    }

    if (recurrence === 'semanal') {
      if (!form.weekday) return null;
      return {
        name,
        type,
        active: form.active ?? true,
        weekday: form.weekday,
        time: form.time ?? '09:00',
        recurrence,
        requiredMembers,
        notes: form.notes,
        date: undefined,
      };
    }

    if (recurrence === 'mensal') {
      if (!form.dayOfMonth) return null;
      return {
        name,
        type,
        active: form.active ?? true,
        weekday: form.weekday ?? 'domingo',
        time: form.time ?? '09:00',
        recurrence,
        dayOfMonth: form.dayOfMonth,
        requiredMembers,
        notes: form.notes,
        date: undefined,
      };
    }

    if (recurrence === 'nenhuma') {
      if (!form.date) {
        alert('Selecione uma data base no calendário para recorrência nenhuma.');
        return null;
      }
      return {
        name,
        type,
        active: form.active ?? true,
        date: form.date,
        weekday: form.weekday ?? 'domingo',
        time: form.time ?? '09:00',
        recurrence: 'nenhuma',
        requiredMembers,
        notes: form.notes,
      };
    }

    if (!form.date) return null;
    return {
      name,
      type,
      active: form.active ?? true,
      date: form.date,
      weekday: form.weekday ?? 'domingo',
      time: form.time ?? '09:00',
      recurrence: 'anual',
      requiredMembers,
      notes: form.notes,
    };
  };

  const handleCreateOrUpdate = () => {
    const payload = buildPayload();
    if (!payload) return;

    if (editingId) {
      if (hasGeneratedSchedule.has(editingId)) {
        const option = window.prompt(
          'Este evento já possui escala gerada. Digite: "proximas" para aplicar apenas nas próximas escalas, "atual" para atualizar também a escala atual, ou "cancelar".',
          'proximas'
        );

        if (!option || option.toLowerCase() === 'cancelar') return;
        const mode = option.toLowerCase() === 'atual' ? 'atual' : 'proximas';
        updateEventRule(editingId, payload, mode);
      } else {
        updateEventRule(editingId, payload, 'proximas');
      }
      resetForm();
      return;
    }

    const eventToCreate: EventRule = {
      id: `event-${crypto.randomUUID()}`,
      name: payload.name ?? '',
      type: payload.type ?? 'recorrente',
      active: payload.active ?? true,
      date: payload.date,
      weekday: payload.weekday ?? 'domingo',
      time: payload.time ?? '09:00',
      recurrence: payload.recurrence ?? 'semanal',
      dayOfMonth: payload.dayOfMonth,
      requiredMembers: payload.requiredMembers ?? 1,
      notes: payload.notes,
    };

    setEventRules((current) => [...current, eventToCreate]);
    resetForm();
  };

  const removeEvent = (id: string) => {
    if (!confirm('Deseja realmente deletar este evento?')) return;
    setEventRules((current) => current.filter((item) => item.id !== id));
  };

  const toggleActive = (id: string) => {
    const selected = eventRules.find((eventRule) => eventRule.id === id);
    if (!selected) return;
    updateEventRule(id, { active: !(selected.active ?? true) }, 'proximas');
  };

  const recurringCount = eventRules.filter((rule) => rule.type === 'recorrente').length;
  const specificCount = eventRules.filter((rule) => rule.type === 'especifico').length;

  return (
    <div className="container">
      <h1 className="page-title">Configuração de eventos</h1>
      <div className="card">
          <h2>{editingId ? 'Editar evento' : 'Adicionar evento'}</h2>
          <div className="input-group">
            <label>
              Nome do evento
              <input value={form.name ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </label>

            <label>
              Tipo de evento
              <select value={form.type ?? 'recorrente'} onChange={(event) => applyTypeDefaults(event.target.value as EventType)}>
                <option value="recorrente">Recorrente</option>
                <option value="especifico">Específico</option>
              </select>
            </label>

            <label>
              Horário
              <input type="time" value={form.time ?? '09:00'} onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))} />
            </label>

            {form.type === 'especifico' ? (
              <label>
                Data do evento (calendário)
                <input type="date" value={form.date ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} required />
              </label>
            ) : (
              <>
                <label>
                  Recorrência
                  <select value={form.recurrence ?? 'semanal'} onChange={(event) => applyRecurrence(event.target.value as EventRecurrence)}>
                    <option value="nenhuma">Nenhuma</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </label>

                {form.recurrence === 'semanal' ? (
                  <label>
                    Dia da semana
                    <select value={form.weekday ?? 'domingo'} onChange={(event) => setForm((prev) => ({ ...prev, weekday: event.target.value as WeekDay }))}>
                      {weekdays.map((weekday) => (
                        <option key={weekday} value={weekday}>{weekday}</option>
                      ))}
                    </select>
                  </label>
                ) : null}

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

                {form.recurrence === 'anual' || form.recurrence === 'nenhuma' ? (
                  <label>
                    Data base (calendário)
                    <input type="date" value={form.date ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
                  </label>
                ) : null}
              </>
            )}

            <label>
              Quantidade de integrantes necessários
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

            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.active ?? true} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} />
              Evento ativo
            </label>

            <div className="form-actions">
              <button className="button" onClick={handleCreateOrUpdate}>{editingId ? 'Salvar edição' : 'Salvar evento'}</button>
              {editingId ? <button className="button secondary" onClick={resetForm}>Cancelar</button> : null}
            </div>
          </div>
      </div>

      <div className="card">
        <h2>Eventos configurados</h2>
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Data ou dia</th>
              <th>Horário</th>
              <th>Qtd. necessária</th>
              <th>Tipo</th>
              <th>Recorrência</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {eventRules.map((rule) => (
              <tr key={rule.id}>
                <td>{rule.name}</td>
                <td>{rule.type === 'especifico' ? rule.date : rule.recurrence === 'mensal' ? `Dia ${rule.dayOfMonth ?? '-'}` : rule.recurrence === 'anual' || rule.recurrence === 'nenhuma' ? rule.date : rule.weekday}</td>
                <td>{rule.time}</td>
                <td>{rule.requiredMembers}</td>
                <td>{formatEventType(rule.type)}</td>
                <td>{formatRecurrence(rule)}</td>
                <td>{rule.active === false ? 'Inativo' : 'Ativo'}</td>
                <td className="actions-cell">
                  <button className="small-button button success" onClick={() => startEdit(rule.id)}>Editar</button>
                  <button className="small-button button" onClick={() => toggleActive(rule.id)}>
                    {rule.active === false ? 'Ativar' : 'Desativar'}
                  </button>
                  <button className="small-button button danger" onClick={() => removeEvent(rule.id)}>
                    Deletar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="overview-muted">
        <h2>Visão geral</h2>
        <p>Total de eventos: <strong>{eventRules.length}</strong> | Recorrentes: <strong>{recurringCount}</strong> | Específicos: <strong>{specificCount}</strong></p>
      </div>
    </div>
  );
}
