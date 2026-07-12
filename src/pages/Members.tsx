import { Dispatch, SetStateAction, useState } from 'react';
import { Member, Unavailability } from '../types';
import { getModuleFunctionConfig, getTeamFunctionLabel } from '../config/moduleFunctions';
import { useAppState } from '../hooks/useAppState';
import { useAccessControl } from '../hooks/useAccessControl';
import { useModule } from '../hooks/useModule';
import { AlertBanner } from '../components/AlertBanner';
import { VIEWER_BLOCK_MESSAGE } from '../utils/access';

const emptyMemberForm = (): Partial<Member> => ({
  name: '',
  nickname: '',
  phone: '',
  active: true,
  functions: [],
  unavailability: [],
  notes: '',
});

type RestrictionState = { date: string; note: string };
type PeriodRestrictionState = { from: string; to: string; note: string };

function MemberRestrictionsFields({
  form,
  setForm,
  eventRules,
  dateRestriction,
  setDateRestriction,
  periodRestriction,
  setPeriodRestriction,
  isAdmin,
  showDateSection,
  showPeriodSection,
}: {
  form: Partial<Member>;
  setForm: Dispatch<SetStateAction<Partial<Member>>>;
  eventRules: ReturnType<typeof useAppState>['eventRules'];
  dateRestriction: RestrictionState;
  setDateRestriction: Dispatch<SetStateAction<RestrictionState>>;
  periodRestriction: PeriodRestrictionState;
  setPeriodRestriction: Dispatch<SetStateAction<PeriodRestrictionState>>;
  isAdmin: boolean;
  showDateSection: boolean;
  showPeriodSection: boolean;
}) {
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
    <>
      <div className="full-width">
        <small style={{ fontWeight: 700 }}>Indisponibilidade por evento (opcional)</small>
        <div className="event-options-grid">
          {eventRules.map((eventRule) => {
            const checked = (form.unavailability ?? []).some((item) => item.type === 'evento' && item.eventId === eventRule.id);
            return (
              <label key={eventRule.id} className="event-option-item">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => addEventUnavailability(eventRule.id)}
                  disabled={!isAdmin}
                  title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                />
                <span>
                  <strong>{eventRule.name}</strong> - {eventRule.type === 'especifico' ? eventRule.date : eventRule.weekday} {eventRule.time}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {showDateSection ? (
        <div className="full-width" style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          <small>Indisponibilidade por data específica</small>
          <div className="form-inline-grid-3">
            <input
              type="date"
              value={dateRestriction.date}
              onChange={(event) => setDateRestriction((prev) => ({ ...prev, date: event.target.value }))}
              disabled={!isAdmin}
              title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
            />
            <input
              placeholder="Observação (opcional)"
              value={dateRestriction.note}
              onChange={(event) => setDateRestriction((prev) => ({ ...prev, note: event.target.value }))}
              disabled={!isAdmin}
              title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
            />
            <button
              type="button"
              className="small-button button"
              onClick={addDateUnavailability}
              disabled={!isAdmin}
              title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
            >
              Adicionar
            </button>
          </div>
        </div>
      ) : null}

      {showPeriodSection ? (
        <div className="full-width" style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          <small>Indisponibilidade por período</small>
          <div className="form-inline-grid-4">
            <input
              type="date"
              value={periodRestriction.from}
              onChange={(event) => setPeriodRestriction((prev) => ({ ...prev, from: event.target.value }))}
              disabled={!isAdmin}
              title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
            />
            <input
              type="date"
              value={periodRestriction.to}
              onChange={(event) => setPeriodRestriction((prev) => ({ ...prev, to: event.target.value }))}
              disabled={!isAdmin}
              title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
            />
            <input
              placeholder="Observação (opcional)"
              value={periodRestriction.note}
              onChange={(event) => setPeriodRestriction((prev) => ({ ...prev, note: event.target.value }))}
              disabled={!isAdmin}
              title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
            />
            <button
              type="button"
              className="small-button button"
              onClick={addPeriodUnavailability}
              disabled={!isAdmin}
              title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
            >
              Adicionar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MemberFunctionsFields({
  moduleId,
  form,
  setForm,
  isAdmin,
}: {
  moduleId: ReturnType<typeof useAppState>['moduleId'];
  form: Partial<Member>;
  setForm: Dispatch<SetStateAction<Partial<Member>>>;
  isAdmin: boolean;
}) {
  const functionConfig = getModuleFunctionConfig(moduleId);
  if (!functionConfig) return null;

  const selectedFunctions = form.functions ?? [];

  return (
    <div className="full-width" style={{ display: 'grid', gap: 8 }}>
      <small style={{ fontWeight: 700 }}>{functionConfig.memberFieldLabel}</small>
      <div className="event-options-grid">
        {functionConfig.options.map((option) => {
          const checked = selectedFunctions.includes(option.key);
          return (
            <label key={option.key} className="event-option-item">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  setForm((prev) => {
                    const current = new Set(prev.functions ?? []);
                    if (current.has(option.key)) {
                      current.delete(option.key);
                    } else {
                      current.add(option.key);
                    }

                    return {
                      ...prev,
                      functions: Array.from(current),
                    };
                  });
                }}
                disabled={!isAdmin}
                title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function MembersPage() {
  const { isAdmin } = useAccessControl();
  const { moduleId } = useModule();
  const { members, createMember, saveMember, toggleMemberActive, deleteMember, eventRules, schedule } = useAppState();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDateSectionOpen, setCreateDateSectionOpen] = useState(false);
  const [createPeriodSectionOpen, setCreatePeriodSectionOpen] = useState(false);

  const [createForm, setCreateForm] = useState<Partial<Member>>(emptyMemberForm());
  const [createNameError, setCreateNameError] = useState<string | null>(null);
  const [createDateRestriction, setCreateDateRestriction] = useState<RestrictionState>({ date: '', note: '' });
  const [createPeriodRestriction, setCreatePeriodRestriction] = useState<PeriodRestrictionState>({ from: '', to: '', note: '' });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Member>>(emptyMemberForm());
  const [editNameError, setEditNameError] = useState<string | null>(null);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [editDateRestriction, setEditDateRestriction] = useState<RestrictionState>({ date: '', note: '' });
  const [editPeriodRestriction, setEditPeriodRestriction] = useState<PeriodRestrictionState>({ from: '', to: '', note: '' });
  const [editDateSectionOpen, setEditDateSectionOpen] = useState(false);
  const [editPeriodSectionOpen, setEditPeriodSectionOpen] = useState(false);

  const sortedMembers = [...members].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
  });

  const resetCreateForm = (closeSection = false) => {
    setCreateForm(emptyMemberForm());
    setCreateNameError(null);
    setCreateDateRestriction({ date: '', note: '' });
    setCreatePeriodRestriction({ from: '', to: '', note: '' });
    setCreateDateSectionOpen(false);
    setCreatePeriodSectionOpen(false);
    if (closeSection) setIsCreateOpen(false);
  };

  const resetEditForm = () => {
    setEditForm(emptyMemberForm());
    setEditNameError(null);
    setEditDateRestriction({ date: '', note: '' });
    setEditPeriodRestriction({ from: '', to: '', note: '' });
    setEditDateSectionOpen(false);
    setEditPeriodSectionOpen(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!isAdmin) {
      alert(VIEWER_BLOCK_MESSAGE);
      return;
    }
    if (!createForm.name?.trim()) {
      setCreateNameError('Informe o nome do integrante.');
      return;
    }
    setCreateNameError(null);
    setMemberActionError(null);

    const payload: Member = {
      id: `member-${crypto.randomUUID()}`,
      name: createForm.name.trim(),
      nickname: createForm.nickname?.trim() || undefined,
      phone: createForm.phone?.trim() || undefined,
      active: createForm.active ?? true,
      functions: createForm.functions ?? [],
      unavailability: createForm.unavailability ?? [],
      notes: createForm.notes?.trim() || undefined,
    };

    const wasCreated = await createMember(payload);
    if (!wasCreated) {
      setMemberActionError('Não foi possível salvar o integrante. Verifique os dados e tente novamente.');
      return;
    }
    resetCreateForm(true);
  };

  const startEdit = (memberId: string) => {
    if (!isAdmin) {
      alert(VIEWER_BLOCK_MESSAGE);
      return;
    }
    if (editingId === memberId) {
      resetEditForm();
      return;
    }

    const selected = members.find((member) => member.id === memberId);
    if (!selected) return;

    setEditNameError(null);
    setMemberActionError(null);
    setEditingId(memberId);
    setEditForm({ ...selected });
    setEditDateRestriction({ date: '', note: '' });
    setEditPeriodRestriction({ from: '', to: '', note: '' });
  };

  const handleSaveEdit = async () => {
    if (!isAdmin) {
      alert(VIEWER_BLOCK_MESSAGE);
      return;
    }
    if (!editingId) return;
    if (!editForm.name?.trim()) {
      setEditNameError('Informe o nome do integrante.');
      return;
    }
    setEditNameError(null);
    setMemberActionError(null);

    const payload: Member = {
      id: editingId,
      name: editForm.name.trim(),
      nickname: editForm.nickname?.trim() || undefined,
      phone: editForm.phone?.trim() || undefined,
      active: editForm.active ?? true,
      functions: editForm.functions ?? [],
      unavailability: editForm.unavailability ?? [],
      notes: editForm.notes?.trim() || undefined,
    };

    const wasSaved = await saveMember(payload);
    if (!wasSaved) {
      setMemberActionError('Não foi possível salvar o integrante. Verifique os dados e tente novamente.');
      return;
    }
    resetEditForm();
  };

  const handleToggleActive = async (id: string) => {
    if (!isAdmin) {
      alert(VIEWER_BLOCK_MESSAGE);
      return;
    }
    setMemberActionError(null);
    const wasToggled = await toggleMemberActive(id);
    if (!wasToggled) {
      setMemberActionError('Não foi possível atualizar o integrante. Tente novamente.');
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!isAdmin) {
      alert(VIEWER_BLOCK_MESSAGE);
      return;
    }
    const inSchedule = schedule.some((item) => item.memberIds.includes(memberId));
    if (inSchedule) {
      alert('Este integrante já está vinculado a uma escala. Para manter histórico, prefira desativá-lo.');
      return;
    }
    if (!confirm('Tem certeza que deseja deletar este integrante? Essa ação não poderá ser desfeita.')) return;
    setMemberActionError(null);
    const wasDeleted = await deleteMember(memberId);
    if (!wasDeleted) {
      setMemberActionError('Não foi possível excluir o integrante. Tente novamente.');
    }
  };

  return (
    <div className="container">
      <main className="page-content">
        <section className="page-section">
          <h1 className="page-title">Cadastro de integrantes</h1>
        </section>

        <section className="page-section">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Lista de integrantes</h2>

            {memberActionError ? <AlertBanner message={memberActionError} /> : null}

            {members.length === 0 ? (
              <p className="muted-text">Nenhum integrante cadastrado ainda.</p>
            ) : (
              <div className="members-list">
                {sortedMembers.map((member) => {
                  const isEditing = editingId === member.id;
                  return (
                    <article key={member.id} className={`card member-item ${isEditing ? 'editing' : ''} ${member.active ? '' : 'inativo'}`}>
                      <div className="member-meta-grid">
                        <p>
                          <span className="member-meta-label">Nome</span>
                          <strong>{member.nickname ?? member.name}</strong>
                          <span className="member-meta-muted">{member.name}</span>
                        </p>
                        <p>
                          <span className="member-meta-label">Telefone</span>
                          <strong>{member.phone || '-'}</strong>
                        </p>
                        <p>
                          <span className="member-meta-label">Status</span>
                          <strong>{member.active ? 'Ativo' : 'Inativo'}</strong>
                        </p>
                        <p>
                          <span className="member-meta-label">Funções</span>
                          <strong>{member.functions && member.functions.length > 0 ? member.functions.map(getTeamFunctionLabel).join(', ') : '-'}</strong>
                        </p>
                        <p>
                          <span className="member-meta-label">Indisponibilidades</span>
                          <strong>{member.unavailability.length === 0 ? 'Sem restrição' : member.unavailability.length}</strong>
                        </p>
                      </div>

                      {isAdmin ? (
                        <div className="actions-cell member-actions">
                          <button
                            type="button"
                            className="small-button button success"
                            onClick={() => startEdit(member.id)}
                          >
                            {isEditing ? 'Fechar edição' : 'Editar'}
                          </button>
                          <button
                            type="button"
                            className="small-button button"
                            onClick={() => void handleToggleActive(member.id)}
                          >
                            {member.active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            type="button"
                            className="small-button button danger"
                            onClick={() => void handleDeleteMember(member.id)}
                          >
                            Deletar
                          </button>
                        </div>
                      ) : null}

                      <div className={`member-inline-editor-shell ${isAdmin && isEditing ? 'open' : ''}`}>
                        <div className="member-inline-editor">
                          <h3>Editar integrante</h3>
                          <div className="input-group form-grid">
                            <label>
                              Nome (obrigatório)
                              <input
                                value={editForm.name ?? ''}
                                onChange={(event) => {
                                  setEditNameError(null);
                                  setEditForm((prev) => ({ ...prev, name: event.target.value }));
                                }}
                                disabled={!isAdmin}
                                title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                              />
                              {editNameError ? <small className="input-error-text">{editNameError}</small> : null}
                            </label>
                            <label>
                              Apelido (opcional)
                              <input
                                value={editForm.nickname ?? ''}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, nickname: event.target.value }))}
                                disabled={!isAdmin}
                                title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                              />
                            </label>
                            <label>
                              Telefone (opcional)
                              <input
                                value={editForm.phone ?? ''}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
                                placeholder="(00) 00000-0000"
                                disabled={!isAdmin}
                                title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                              />
                            </label>

                            <MemberFunctionsFields
                              moduleId={moduleId}
                              form={editForm}
                              setForm={setEditForm}
                              isAdmin={isAdmin}
                            />

                            <div className="full-width restriction-toggle-group">
                              <button
                                type="button"
                                className="button secondary small-button restriction-toggle"
                                onClick={() => setEditDateSectionOpen((current) => !current)}
                              >
                                + Indisponibilidade por data específica
                              </button>
                              <div className={`restriction-collapsible ${editDateSectionOpen ? 'open' : ''}`}>
                                <div className="restriction-collapsible-inner">
                                  <MemberRestrictionsFields
                                    form={editForm}
                                    setForm={setEditForm}
                                    eventRules={eventRules}
                                    dateRestriction={editDateRestriction}
                                    setDateRestriction={setEditDateRestriction}
                                    periodRestriction={editPeriodRestriction}
                                    setPeriodRestriction={setEditPeriodRestriction}
                                    isAdmin={isAdmin}
                                    showDateSection
                                    showPeriodSection={false}
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                className="button secondary small-button restriction-toggle"
                                onClick={() => setEditPeriodSectionOpen((current) => !current)}
                              >
                                + Indisponibilidade por período
                              </button>
                              <div className={`restriction-collapsible ${editPeriodSectionOpen ? 'open' : ''}`}>
                                <div className="restriction-collapsible-inner">
                                  <MemberRestrictionsFields
                                    form={editForm}
                                    setForm={setEditForm}
                                    eventRules={eventRules}
                                    dateRestriction={editDateRestriction}
                                    setDateRestriction={setEditDateRestriction}
                                    periodRestriction={editPeriodRestriction}
                                    setPeriodRestriction={setEditPeriodRestriction}
                                    isAdmin={isAdmin}
                                    showDateSection={false}
                                    showPeriodSection
                                  />
                                </div>
                              </div>
                            </div>

                            <label className="full-width">
                              Observações (opcional)
                              <textarea
                                rows={3}
                                value={editForm.notes ?? ''}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))}
                                disabled={!isAdmin}
                                title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                              />
                            </label>

                            <label className="full-width inline-checkbox-label">
                              <input
                                type="checkbox"
                                checked={editForm.active ?? true}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, active: event.target.checked }))}
                                disabled={!isAdmin}
                                title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                              />
                              Integrante ativo
                            </label>

                            {isAdmin ? (
                              <div className="form-actions full-width inline-edit-actions">
                                <button
                                  type="button"
                                  className="button"
                                  onClick={() => void handleSaveEdit()}
                                >
                                  Salvar alterações
                                </button>
                                <button type="button" className="button secondary" onClick={resetEditForm}>Cancelar</button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="page-section">
          <div id="add-integrante-section" className="add-collapsible-card">
            {isAdmin ? (
              <button
                type="button"
                className={`button add-toggle-button ${isCreateOpen ? 'open' : ''}`}
                aria-expanded={isCreateOpen}
                onClick={() => setIsCreateOpen((current) => !current)}
              >
                + Adicionar novo integrante
              </button>
            ) : null}

            <div className={`collapsible-content ${isAdmin && isCreateOpen ? 'open' : ''}`}>
              <div className="collapsible-inner">
                <h2 style={{ marginTop: 0 }}>Novo integrante</h2>
                <div className="input-group form-grid">
                  <label>
                    Nome (obrigatório)
                    <input
                      value={createForm.name ?? ''}
                      onChange={(event) => {
                        setCreateNameError(null);
                        setCreateForm((prev) => ({ ...prev, name: event.target.value }));
                      }}
                      disabled={!isAdmin}
                      title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                    />
                    {createNameError ? <small className="input-error-text">{createNameError}</small> : null}
                  </label>
                  <label>
                    Apelido (opcional)
                    <input
                      value={createForm.nickname ?? ''}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, nickname: event.target.value }))}
                      disabled={!isAdmin}
                      title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                    />
                  </label>
                  <label>
                    Telefone (opcional)
                    <input
                      value={createForm.phone ?? ''}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
                      placeholder="(00) 00000-0000"
                      disabled={!isAdmin}
                      title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                    />
                  </label>

                  <MemberFunctionsFields
                    moduleId={moduleId}
                    form={createForm}
                    setForm={setCreateForm}
                    isAdmin={isAdmin}
                  />

                  <div className="full-width restriction-toggle-group">
                    <button
                      type="button"
                      className="button secondary small-button restriction-toggle"
                      onClick={() => setCreateDateSectionOpen((current) => !current)}
                    >
                      + Indisponibilidade por data específica
                    </button>
                    <div className={`restriction-collapsible ${createDateSectionOpen ? 'open' : ''}`}>
                      <div className="restriction-collapsible-inner">
                        <MemberRestrictionsFields
                          form={createForm}
                          setForm={setCreateForm}
                          eventRules={eventRules}
                          dateRestriction={createDateRestriction}
                          setDateRestriction={setCreateDateRestriction}
                          periodRestriction={createPeriodRestriction}
                          setPeriodRestriction={setCreatePeriodRestriction}
                          isAdmin={isAdmin}
                          showDateSection
                          showPeriodSection={false}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="button secondary small-button restriction-toggle"
                      onClick={() => setCreatePeriodSectionOpen((current) => !current)}
                    >
                      + Indisponibilidade por período
                    </button>
                    <div className={`restriction-collapsible ${createPeriodSectionOpen ? 'open' : ''}`}>
                      <div className="restriction-collapsible-inner">
                        <MemberRestrictionsFields
                          form={createForm}
                          setForm={setCreateForm}
                          eventRules={eventRules}
                          dateRestriction={createDateRestriction}
                          setDateRestriction={setCreateDateRestriction}
                          periodRestriction={createPeriodRestriction}
                          setPeriodRestriction={setCreatePeriodRestriction}
                          isAdmin={isAdmin}
                          showDateSection={false}
                          showPeriodSection
                        />
                      </div>
                    </div>
                  </div>

                  <label className="full-width">
                    Observações (opcional)
                    <textarea
                      rows={3}
                      value={createForm.notes ?? ''}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, notes: event.target.value }))}
                      disabled={!isAdmin}
                      title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                    />
                  </label>

                  <label className="full-width inline-checkbox-label">
                    <input
                      type="checkbox"
                      checked={createForm.active ?? true}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, active: event.target.checked }))}
                      disabled={!isAdmin}
                      title={!isAdmin ? VIEWER_BLOCK_MESSAGE : undefined}
                    />
                    Integrante ativo
                  </label>

                  {isAdmin ? (
                    <div className="form-actions full-width add-integrante-actions">
                      <button
                        type="button"
                        className="button"
                        onClick={() => void handleCreate()}
                      >
                        Salvar integrante
                      </button>
                      <button type="button" className="button secondary" onClick={() => resetCreateForm(true)}>Cancelar</button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
