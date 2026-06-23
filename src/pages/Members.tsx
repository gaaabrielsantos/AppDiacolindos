import { useMemo, useState } from 'react';
import { Member } from '../types';
import { useAppState } from '../hooks/useAppState';

export function MembersPage() {
  const { members, setMembers, eventRules, schedule } = useAppState();
  const [form, setForm] = useState<Partial<Member>>({
    name: '',
    nickname: '',
    phone: '',
    email: '',
    active: true,
    eventAvailability: [],
    dateExceptions: [],
    notes: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState('');

  const activeMembers = useMemo(() => members.filter((member) => member.active).length, [members]);

  const resetForm = () => {
    setForm({ name: '', nickname: '', phone: '', email: '', active: true, eventAvailability: [], dateExceptions: [], notes: '' });
    setEditingId(null);
  };

  const handleCreateOrUpdate = () => {
    if (!form.name?.trim()) return;

    if (editingId) {
      setMembers((current) => current.map((m) => (m.id === editingId ? { ...m, ...form, name: form.name!.trim() } : m)));
      resetForm();
      return;
    }

    const newMember: Member = {
      id: `member-${crypto.randomUUID()}`,
      name: form.name.trim(),
      nickname: form.nickname?.trim() || form.name.trim().split(' ')[0],
      phone: form.phone?.trim(),
      email: form.email?.trim(),
      active: form.active ?? true,
      eventAvailability: form.eventAvailability ?? [],
      dateExceptions: form.dateExceptions ?? [],
      notes: form.notes,
    };

    setMembers((current) => [...current, newMember]);
    if (newMember.eventAvailability.length === 0) {
      setInfoMessage('Este integrante ainda não possui eventos disponíveis configurados.');
      window.setTimeout(() => setInfoMessage(''), 3000);
    }
    resetForm();
  };

  const startEdit = (memberId: string) => {
    const m = members.find((x) => x.id === memberId);
    if (!m) return;
    setForm({ ...m });
    setEditingId(memberId);
  };

  const toggleActive = (id: string) => {
    setMembers((current) => current.map((member) => (member.id === id ? { ...member, active: !member.active } : member)));
  };

  const deleteMember = (memberId: string) => {
    const inSchedule = schedule.some((s) => s.memberIds.includes(memberId));
    if (inSchedule) {
      alert('Este integrante já está vinculado a uma escala. Para manter histórico, prefira desativá-lo.');
      return;
    }
    if (!confirm('Tem certeza que deseja deletar este integrante? Essa ação não poderá ser desfeita.')) return;
    setMembers((current) => current.filter((m) => m.id !== memberId));
  };

  const toggleEventAvailabilityInForm = (eventId: string) => {
    const set = new Set(form.eventAvailability ?? []);
    if (set.has(eventId)) set.delete(eventId); else set.add(eventId);
    setForm((prev) => ({ ...prev, eventAvailability: Array.from(set) }));
  };

  return (
    <div className="container">
      <h1 className="page-title">Cadastro de integrantes</h1>
      <div className="grid-2">
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
            <label>
              E-mail (opcional)
              <input value={form.email ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
            </label>
            <div>
              <small>Disponibilidade por evento (opcional)</small>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {eventRules.map((eventRule) => (
                  <label key={eventRule.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={(form.eventAvailability ?? []).includes(eventRule.id)}
                      onChange={() => toggleEventAvailabilityInForm(eventRule.id)}
                    />
                    {eventRule.name} - {eventRule.weekday} {eventRule.time}
                  </label>
                ))}
              </div>
            </div>
            <label>
              Observações (opcional)
              <textarea rows={3} value={form.notes ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="button" onClick={handleCreateOrUpdate} style={{ width: 'fit-content' }}>
                {editingId ? 'Salvar alterações' : 'Adicionar integrante'}
              </button>
              {editingId ? (
                <button className="button" style={{ background: '#64748b', width: 'fit-content' }} onClick={resetForm}>
                  Cancelar
                </button>
              ) : null}
            </div>
            {infoMessage ? <p style={{ color: '#92400e' }}>{infoMessage}</p> : null}
          </div>
        </div>

        <div className="card">
          <h2>Resumo rápido</h2>
          <p>Total de integrantes ativos: <strong>{activeMembers}</strong></p>
          <p>Total de integrantes cadastrados: <strong>{members.length}</strong></p>
          <p>Total de integrantes inativos: <strong>{members.length - activeMembers}</strong></p>
        </div>
      </div>

      <div className="card">
        <h2>Lista de integrantes</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Status</th>
              <th>Eventos disponíveis</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.nickname ?? member.name} - {member.name}</td>
                <td>{member.phone || '-'} {member.email ? `| ${member.email}` : ''}</td>
                <td>{member.active ? 'Ativo' : 'Inativo'}</td>
                <td>{member.eventAvailability.length === 0 ? 'Sem restrição' : member.eventAvailability.length}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="small-button button" style={{ background: '#0ea5a4' }} onClick={() => startEdit(member.id)}>Editar</button>
                  <button className="small-button button" style={{ background: '#2563eb' }} onClick={() => toggleActive(member.id)}>
                    {member.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button className="small-button button" style={{ background: '#dc2626' }} onClick={() => deleteMember(member.id)}>Deletar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
