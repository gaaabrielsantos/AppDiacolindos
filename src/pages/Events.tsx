import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { EventRule, WeekDay } from '../types';
import { useAppState } from '../hooks/useAppState';
import { useAccessControl } from '../hooks/useAccessControl';
import { VIEWER_BLOCK_MESSAGE } from '../utils/access';

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

function EventFormFields({
  form,
  setForm,
  onSave,
  onCancel,
  saveLabel,
}: {
  form: Partial<EventRule>;
  setForm: Dispatch<SetStateAction<Partial<EventRule>>>;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
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

  return (
    <div className="input-group form-grid">
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

      <label className="full-width">
        Observações
        <textarea rows={3} value={form.notes ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
      </label>

      <label className="full-width inline-checkbox-label">
        <input type="checkbox" checked={form.active ?? true} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} />
        Evento ativo
      </label>

      <div className="form-actions full-width">
        <button type="button" className="button" onClick={onSave}>{saveLabel}</button>
        <button type="button" className="button secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

export function EventsPage() {
  const { isAdmin } = useAccessControl();
  const { eventRules, setEventRules, schedule, updateEventRule } = useAppState();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<EventRule>>(emptyForm());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<EventRule>>(emptyForm());

  const hasGeneratedSchedule = useMemo(() => new Set(schedule.map((item) => item.eventRuleId)), [schedule]);

  const resetCreateForm = (closeSection = false) => {
    setCreateForm(emptyForm());
    if (closeSection) setIsCreateOpen(false);
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm());
  };

  const startEdit = (eventId: string) => {
    if (!isAdmin) {
      alert(VIEWER_BLOCK_MESSAGE);
      return;
    }
    const selected = eventRules.find((eventRule) => eventRule.id === eventId);
    if (!selected) return;

    setEditForm({
      ...selected,
      type: selected.type ?? 'recorrente',
      date: selected.date ?? '',
      recurrence: selected.recurrence ?? 'semanal',
    });
    setEditingId(eventId);
  };

  const buildPayload = (form: Partial<EventRule>): Partial<EventRule> | null => {
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

  const handleCreate = () => {
    if (!isAdmin) {
      alert(VIEWER_BLOCK_MESSAGE);
      return;
    }
    const payload = buildPayload(createForm);
    if (!payload) return;

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
    resetCreateForm(true);
  };

  const handleSaveEdit = () => {
    if (!isAdmin) {
      alert(VIEWER_BLOCK_MESSAGE);
      return;
    }
    if (!editingId) return;

    const payload = buildPayload(editForm);
    if (!payload) return;

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

    closeEdit();
  };

  const removeEvent = (id: string) => {
    if (!isAdmin) {
      alert(VIEWER_BLOCK_MESSAGE);
      return;
    }
    if (!confirm('Deseja realmente deletar este evento?')) return;
    setEventRules((current) => current.filter((item) => item.id !== id));
  };

  const toggleActive = (id: string) => {
    if (!isAdmin) {
      alert(VIEWER_BLOCK_MESSAGE);
      return;
    }
    const selected = eventRules.find((eventRule) => eventRule.id === id);
    if (!selected) return;
    updateEventRule(id, { active: !(selected.active ?? true) }, 'proximas');
  };

  const recurringCount = eventRules.filter((rule) => rule.type === 'recorrente').length;
  const specificCount = eventRules.filter((rule) => rule.type === 'especifico').length;

  return (
    <div className="container">
      <main className="page-content">
        <section className="page-section">
          <h1 className="page-title">Configuração de eventos</h1>
        </section>

        <section className="page-section">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Eventos configurados</h2>
            <div className="table-wrap">
            <table className="table responsive-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Data ou dia</th>
                  <th>Horário</th>
                  <th>Qtd. necessária</th>
                  <th>Tipo</th>
                  <th>Recorrência</th>
                  <th>Status</th>
                  {isAdmin ? <th>Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {eventRules.map((rule) => (
                  <tr key={rule.id}>
                    <td data-label="Evento">{rule.name}</td>
                    <td data-label="Data ou dia">{rule.type === 'especifico' ? rule.date : rule.recurrence === 'mensal' ? `Dia ${rule.dayOfMonth ?? '-'}` : rule.recurrence === 'anual' || rule.recurrence === 'nenhuma' ? rule.date : rule.weekday}</td>
                    <td data-label="Horário">{rule.time}</td>
                    <td data-label="Qtd. necessária">{rule.requiredMembers}</td>
                    <td data-label="Tipo">{formatEventType(rule.type)}</td>
                    <td data-label="Recorrência">{formatRecurrence(rule)}</td>
                    <td data-label="Status">{rule.active === false ? 'Inativo' : 'Ativo'}</td>
                    {isAdmin ? (
                      <td data-label="Ações" className="actions-cell">
                        <button
                          type="button"
                          className="small-button button success"
                          onClick={() => startEdit(rule.id)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="small-button button"
                          onClick={() => toggleActive(rule.id)}
                        >
                          {rule.active === false ? 'Ativar' : 'Desativar'}
                        </button>
                        <button
                          type="button"
                          className="small-button button danger"
                          onClick={() => removeEvent(rule.id)}
                        >
                          Deletar
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="overview-muted">
            <h2>Visão geral</h2>
            <p>Total de eventos: <strong>{eventRules.length}</strong> | Recorrentes: <strong>{recurringCount}</strong> | Específicos: <strong>{specificCount}</strong></p>
          </div>
        </section>

        <section className="page-section">
          <div id="add-evento-section" className="add-collapsible-card">
            {isAdmin ? (
              <button
                type="button"
                className={`button add-toggle-button ${isCreateOpen ? 'open' : ''}`}
                aria-expanded={isCreateOpen}
                onClick={() => setIsCreateOpen((current) => !current)}
              >
                + Adicionar novo evento
              </button>
            ) : null}
            <div className={`collapsible-content ${isAdmin && isCreateOpen ? 'open' : ''}`}>
              <div className="collapsible-inner">
                <h2 style={{ marginTop: 0 }}>Novo evento</h2>
                <EventFormFields
                  form={createForm}
                  setForm={setCreateForm}
                  onSave={handleCreate}
                  onCancel={() => resetCreateForm(true)}
                  saveLabel="Salvar evento"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {editingId ? (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Editar evento</h2>
              <EventFormFields
                form={editForm}
                setForm={setEditForm}
                onSave={handleSaveEdit}
                onCancel={closeEdit}
                saveLabel="Salvar edição"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
