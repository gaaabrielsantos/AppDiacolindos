import { useState } from 'react';
import { Member, Unavailability } from '../types';
import { useAppState } from '../hooks/useAppState';

export function MembersPage() {
  const { members, setMembers, eventRules, schedule } = useAppState();
  const [form, setForm] = useState<Partial<Member>>({
    name: '',
    nickname: '',
    phone: '',
    active: true,
    unavailability: [],
    notes: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateRestriction, setDateRestriction] = useState({ date: '', note: '' });
  const [periodRestriction, setPeriodRestriction] = useState({ from: '', to: '', note: '' });

  const resetForm = () => {
    setForm({ name: '', nickname: '', phone: '', active: true, unavailability: [], notes: '' });
    setDateRestriction({ date: '', note: '' });
    setPeriodRestriction({ from: '', to: '', note: '' });
    setEditingId(null);
  };

  const handleCreateOrUpdate = () => {
    if (!form.name?.trim()) return;

    const payload: Member = {
      id: editingId ?? `member-${crypto.randomUUID()}`,
      name: form.name.trim(),
      nickname: form.nickname?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      active: form.active ?? true,
      unavailability: form.unavailability ?? [],
      notes: form.notes?.trim() || undefined,
    };

    if (editingId) {
      setMembers((current) => current.map((member) => (member.id === editingId ? payload : member)));
    } else {
      setMembers((current) => [...current, payload]);
    }

    resetForm();
  };

  const startEdit = (memberId: string) => {
    const selected = members.find((member) => member.id === memberId);
    if (!selected) return;
    setForm({ ...selected });
    setEditingId(memberId);
    setDateRestriction({ date: '', note: '' });
    setPeriodRestriction({ from: '', to: '', note: '' });
  };

  const toggleActive = (id: string) => {
    setMembers((current) => current.map((member) => (member.id === id ? { ...member, active: !member.active } : member)));
  };

  const deleteMember = (memberId: string) => {
    const inSchedule = schedule.some((item) => item.memberIds.includes(memberId));
    if (inSchedule) {
      alert('Este integrante já está vinculado a uma escala. Para manter histórico, prefira desativá-lo.');
      return;
    }
    if (!confirm('Tem certeza que deseja deletar este integrante? Essa ação não poderá ser desfeita.')) return;
    setMembers((current) => current.filter((member) => member.id !== memberId));
  };

  const addEventUnavailability = (eventId: string) => {
    const current = form.unavailability ?? [];
    const exists = current.some((item) => item.type === 'evento' && item.eventId === eventId);
    if (exists) {
      setForm((prev) => ({
        ...prev,
        unavailability: (prev.unavailability ?? []).filter((item) => !(item.type === 'evento' && item.eventId === eventId)),
      }));
      return;
    }

    const newRestriction: Unavailability = {
      id: `unv-${crypto.randomUUID()}`,
      type: 'evento',
      eventId,
    };
    setForm((prev) => ({ ...prev, unavailability: [...(prev.unavailability ?? []), newRestriction] }));
  };

  const addDateUnavailability = () => {
    if (!dateRestriction.date) return;
    const newRestriction: Unavailability = {
      id: `unv-${crypto.randomUUID()}`,
      type: 'data',
      date: dateRestriction.date,
      note: dateRestriction.note || undefined,
    };
    setForm((prev) => ({ ...prev, unavailability: [...(prev.unavailability ?? []), newRestriction] }));
    setDateRestriction({ date: '', note: '' });
  };

  const addPeriodUnavailability = () => {
    if (!periodRestriction.from || !periodRestriction.to) return;
    const newRestriction: Unavailability = {
      id: `unv-${crypto.randomUUID()}`,
      type: 'periodo',
      from: periodRestriction.from,
      to: periodRestriction.to,
      note: periodRestriction.note || undefined,
    };
    setForm((prev) => ({ ...prev, unavailability: [...(prev.unavailability ?? []), newRestriction] }));
    setPeriodRestriction({ from: '', to: '', note: '' });
  };

  return (
    <div className="container">
      <h1 className="page-title">Cadastro de integrantes</h1>
      <div className="card">
        <h2>{editingId ? 'Editar integrante' : 'Adicionar integrante'}</h2>
        <div className="input-group">
          <label>
            Nome (obrigatório)
            <input value={form.name ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </label>
          <label>
            Apelido (opcional)
            <input value={form.nickname ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, nickname: event.target.value }))} />
          </label>
          <label>
            Telefone (opcional)
            <input value={form.phone ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
          </label>

          <div>
            <small style={{ fontWeight: 700 }}>Indisponibilidade por evento (opcional)</small>
            <div className="event-options-grid">
              {eventRules.map((eventRule) => {
                const checked = (form.unavailability ?? []).some((item) => item.type === 'evento' && item.eventId === eventRule.id);
                return (
                  <label key={eventRule.id} className="event-option-item">
                    <input type="checkbox" checked={checked} onChange={() => addEventUnavailability(eventRule.id)} />
                    <span><strong>{eventRule.name}</strong> - {eventRule.type === 'especifico' ? eventRule.date : eventRule.weekday} {eventRule.time}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            <small>Indisponibilidade por data específica</small>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
              <input type="date" value={dateRestriction.date} onChange={(event) => setDateRestriction((prev) => ({ ...prev, date: event.target.value }))} />
              <input placeholder="Observação (opcional)" value={dateRestriction.note} onChange={(event) => setDateRestriction((prev) => ({ ...prev, note: event.target.value }))} />
              <button className="small-button button" onClick={addDateUnavailability}>Adicionar</button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            <small>Indisponibilidade por período</small>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
              <input type="date" value={periodRestriction.from} onChange={(event) => setPeriodRestriction((prev) => ({ ...prev, from: event.target.value }))} />
              <input type="date" value={periodRestriction.to} onChange={(event) => setPeriodRestriction((prev) => ({ ...prev, to: event.target.value }))} />
              <input placeholder="Observação (opcional)" value={periodRestriction.note} onChange={(event) => setPeriodRestriction((prev) => ({ ...prev, note: event.target.value }))} />
              <button className="small-button button" onClick={addPeriodUnavailability}>Adicionar</button>
            </div>
          </div>

          <label>
            Observações (opcional)
            <textarea rows={3} value={form.notes ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>

          <div className="form-actions">
            <button className="button" onClick={handleCreateOrUpdate}>
              {editingId ? 'Salvar alterações' : 'Adicionar integrante'}
            </button>
            {editingId ? (
              <button className="button secondary" onClick={resetForm}>
                Cancelar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Lista de integrantes</h2>
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Status</th>
              <th>Indisponibilidades</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td><strong>{member.nickname ?? member.name}</strong> - {member.name}</td>
                <td>{member.phone || '-'}</td>
                <td>{member.active ? 'Ativo' : 'Inativo'}</td>
                <td>{member.unavailability.length === 0 ? 'Sem restrição' : member.unavailability.length}</td>
                <td className="actions-cell">
                  <button className="small-button button success" onClick={() => startEdit(member.id)}>Editar</button>
                  <button className="small-button button" onClick={() => toggleActive(member.id)}>
                    {member.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button className="small-button button danger" onClick={() => deleteMember(member.id)}>Deletar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
