import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppModuleId } from '../config/modules';
import { AlertBanner } from '../components/AlertBanner';
import { mockEventRules, mockHistory, mockMembers } from '../data/mockData';
import { EventRule, Member, ScalePdfHistoryRecord, ScheduleItem, SwapHistory } from '../types';
import { buildSchedule } from '../utils/generator';
import { getWeekDay, nextQuarterRange } from '../utils/date';
import { buildSchedulePdf } from '../utils/schedulePdf';
import { buildAssignmentsFromSelectedMembers, getRequiredMembersCount, ScheduleAssignment } from '../utils/scheduleFunctions';
import { isSupabaseConfigured, supabase } from '../services/supabase';

interface AppStateContext {
  moduleId: AppModuleId;
  members: Member[];
  eventRules: EventRule[];
  schedule: ScheduleItem[];
  history: SwapHistory[];
  scalePdfHistory: ScalePdfHistoryRecord[];
  alerts: string[];
  isLoading: boolean;
  errorMessage: string | null;
  defaultPeriod: { startDate: string; endDate: string };
  refreshAppData: () => Promise<void>;
  createMember: (member: Member) => Promise<boolean>;
  saveMember: (member: Member) => Promise<boolean>;
  toggleMemberActive: (memberId: string) => Promise<boolean>;
  deleteMember: (memberId: string) => Promise<boolean>;
  createEventRule: (eventRule: EventRule) => Promise<boolean>;
  deleteEventRule: (eventId: string) => Promise<boolean>;
  generateSchedule: (startDate: string, endDate: string) => Promise<boolean>;
  updateEventRule: (eventId: string, patch: Partial<EventRule>, mode: 'proximas' | 'atual') => Promise<boolean>;
  updateScheduleMembers: (scheduleId: string, memberIds: string[], reason?: string, memberAssignments?: ScheduleAssignment[]) => Promise<boolean>;
  deleteScalePdfHistory: (recordId: string) => Promise<boolean>;
  addHistory: (entry: SwapHistory) => Promise<boolean>;
}

type MemberRow = Member & { module_id: AppModuleId };

type MemberFunctionRow = {
  module_id: AppModuleId;
  member_id: string;
  function_key: NonNullable<Member['functions']>[number];
};

type EventRuleRow = {
  id: string;
  module_id: AppModuleId;
  name: string;
  type: EventRule['type'];
  active: boolean | null;
  date: string | null;
  weekday: EventRule['weekday'];
  time: string;
  recurrence: EventRule['recurrence'];
  day_of_month: number | null;
  required_members: number;
  role_requirements: EventRule['roleRequirements'] | null;
  notes: string | null;
};

type ScheduleRow = {
  id: string;
  module_id: AppModuleId;
  event_rule_id: string;
  date: string;
  weekday: ScheduleItem['weekday'];
  time: string;
  event_name: string;
  member_ids: string[];
  member_assignments: ScheduleItem['memberAssignments'] | null;
  required_members: number;
  status: ScheduleItem['status'];
};

type HistoryRow = {
  id: string;
  module_id: AppModuleId;
  changed_at: string;
  changed_by: string;
  event_date: string;
  event_time: string;
  event_name: string;
  original_member_id: string | null;
  substitute_member_id: string | null;
  reason: string | null;
};

type ScalePdfHistoryRow = {
  id: string;
  module_id: AppModuleId;
  file_name: string;
  generated_at: string;
  period_start: string;
  period_end: string;
  events_count: number;
  used_members_count: number;
  status: ScalePdfHistoryRecord['status'];
  pdf_data_url: string;
};

const fallbackPeriod = nextQuarterRange();

const defaultContext: AppStateContext = {
  moduleId: 'diaconia',
  members: [],
  eventRules: [],
  schedule: [],
  history: [],
  scalePdfHistory: [],
  alerts: [],
  isLoading: true,
  errorMessage: null,
  defaultPeriod: { startDate: fallbackPeriod.start, endDate: fallbackPeriod.end },
  refreshAppData: async () => {},
  createMember: async () => false,
  saveMember: async () => false,
  toggleMemberActive: async () => false,
  deleteMember: async () => false,
  createEventRule: async () => false,
  deleteEventRule: async () => false,
  generateSchedule: async () => false,
  updateEventRule: async () => false,
  updateScheduleMembers: async () => false,
  deleteScalePdfHistory: async () => false,
  addHistory: async () => false,
};

const AppStateContext = createContext<AppStateContext>(defaultContext);

function getLocalPdfStorageKey(moduleId: AppModuleId) {
  return `diacolindos-scale-pdf-history-${moduleId}`;
}

function getStoredPdfHistory(moduleId: AppModuleId) {
  try {
    const raw = localStorage.getItem(getLocalPdfStorageKey(moduleId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScalePdfHistoryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistPdfHistory(moduleId: AppModuleId, records: ScalePdfHistoryRecord[]) {
  localStorage.setItem(getLocalPdfStorageKey(moduleId), JSON.stringify(records));
}

function mapMemberRow(row: MemberRow, functions: Member['functions'] = []): Member {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname,
    phone: row.phone,
    active: row.active,
    functions,
    unavailability: row.unavailability ?? [],
    notes: row.notes,
  };
}

function mapMemberToRow(moduleId: AppModuleId, member: Member): MemberRow {
  return {
    ...member,
    active: member.active ?? true,
    functions: member.functions ?? [],
    unavailability: member.unavailability ?? [],
    module_id: moduleId,
  };
}

function mapEventRuleRow(row: EventRuleRow): EventRule {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    active: row.active ?? true,
    date: row.date ?? undefined,
    weekday: row.weekday,
    time: row.time,
    recurrence: row.recurrence,
    dayOfMonth: row.day_of_month ?? undefined,
    requiredMembers: row.required_members,
    roleRequirements: row.role_requirements ?? [],
    notes: row.notes ?? undefined,
  };
}

function mapEventRuleToRow(moduleId: AppModuleId, rule: EventRule): EventRuleRow {
  return {
    id: rule.id,
    module_id: moduleId,
    name: rule.name,
    type: rule.type,
    active: rule.active ?? true,
    date: rule.date ?? null,
    weekday: rule.weekday,
    time: rule.time,
    recurrence: rule.recurrence,
    day_of_month: rule.dayOfMonth ?? null,
    required_members: rule.requiredMembers,
    role_requirements: rule.roleRequirements ?? null,
    notes: rule.notes ?? null,
  };
}

function mapScheduleRow(row: ScheduleRow): ScheduleItem {
  return {
    id: row.id,
    eventRuleId: row.event_rule_id,
    date: row.date,
    weekday: row.weekday,
    time: row.time,
    eventName: row.event_name,
    memberIds: row.member_ids ?? [],
    memberAssignments: row.member_assignments ?? (row.member_ids ?? []).map((memberId) => ({ memberId })),
    requiredMembers: row.required_members,
    status: row.status,
  };
}

function mapScheduleToRow(moduleId: AppModuleId, item: ScheduleItem): ScheduleRow {
  return {
    id: item.id,
    module_id: moduleId,
    event_rule_id: item.eventRuleId,
    date: item.date,
    weekday: item.weekday,
    time: item.time,
    event_name: item.eventName,
    member_ids: item.memberIds,
    member_assignments: item.memberAssignments ?? item.memberIds.map((memberId) => ({ memberId })),
    required_members: item.requiredMembers,
    status: item.status,
  };
}

function mapHistoryRow(row: HistoryRow): SwapHistory {
  return {
    id: row.id,
    changedAt: row.changed_at,
    changedBy: row.changed_by,
    eventDate: row.event_date,
    eventTime: row.event_time,
    eventName: row.event_name,
    originalMemberId: row.original_member_id ?? undefined,
    substituteMemberId: row.substitute_member_id ?? undefined,
    reason: row.reason ?? undefined,
  };
}

function mapHistoryToRow(moduleId: AppModuleId, entry: SwapHistory): HistoryRow {
  return {
    id: entry.id,
    module_id: moduleId,
    changed_at: entry.changedAt,
    changed_by: entry.changedBy,
    event_date: entry.eventDate,
    event_time: entry.eventTime,
    event_name: entry.eventName,
    original_member_id: entry.originalMemberId ?? null,
    substitute_member_id: entry.substituteMemberId ?? null,
    reason: entry.reason ?? null,
  };
}

function mapScalePdfHistoryRow(row: ScalePdfHistoryRow): ScalePdfHistoryRecord {
  return {
    id: row.id,
    moduleId: row.module_id,
    fileName: row.file_name,
    generatedAt: row.generated_at,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    eventsCount: row.events_count,
    usedMembersCount: row.used_members_count,
    status: row.status,
    pdfDataUrl: row.pdf_data_url,
  };
}

function mapScalePdfHistoryToRow(moduleId: AppModuleId, record: ScalePdfHistoryRecord): ScalePdfHistoryRow {
  return {
    id: record.id,
    module_id: moduleId,
    file_name: record.fileName,
    generated_at: record.generatedAt,
    period_start: record.periodStart,
    period_end: record.periodEnd,
    events_count: record.eventsCount,
    used_members_count: record.usedMembersCount,
    status: record.status,
    pdf_data_url: record.pdfDataUrl,
  };
}

function buildAlertsFromSchedule(schedule: ScheduleItem[]) {
  return schedule
    .filter((item) => item.memberIds.length < item.requiredMembers)
    .map((item) => `Escala incompleta em ${item.eventName} (${item.date} ${item.time}): necessários ${item.requiredMembers}, disponíveis ${item.memberIds.length}.`);
}

function buildMemberFunctionsRows(moduleId: AppModuleId, member: Member): MemberFunctionRow[] {
  return (member.functions ?? []).map((functionKey) => ({
    module_id: moduleId,
    member_id: member.id,
    function_key: functionKey,
  }));
}

export function AppProvider({ children, moduleId }: { children: React.ReactNode; moduleId: AppModuleId }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [eventRules, setEventRules] = useState<EventRule[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [history, setHistory] = useState<SwapHistory[]>([]);
  const [scalePdfHistory, setScalePdfHistory] = useState<ScalePdfHistoryRecord[]>(() => getStoredPdfHistory(moduleId));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultPeriod = useMemo(() => {
    const range = nextQuarterRange();
    return { startDate: range.start, endDate: range.end };
  }, []);

  const alerts = useMemo(() => buildAlertsFromSchedule(schedule), [schedule]);

  const refreshAppData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      if (import.meta.env.DEV) {
        setMembers(mockMembers);
        setEventRules(mockEventRules);
        setSchedule([]);
        setHistory(mockHistory);
        setScalePdfHistory(getStoredPdfHistory(moduleId));
        setErrorMessage('Supabase não está configurado neste ambiente. Os dados exibidos são mocks locais de desenvolvimento.');
        setIsLoading(false);
        return;
      }

      setMembers([]);
      setEventRules([]);
      setSchedule([]);
      setHistory([]);
      setScalePdfHistory([]);
      setErrorMessage('Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para carregar os dados.');
      setIsLoading(false);
      return;
    }

    try {
      const [membersResult, memberFunctionsResult, eventRulesResult, scheduleResult, historyResult, pdfHistoryResult] = await Promise.all([
        supabase.from('members').select('*').eq('module_id', moduleId).order('name', { ascending: true }),
        supabase.from('member_functions').select('*').eq('module_id', moduleId),
        supabase.from('event_rules').select('*').eq('module_id', moduleId).order('name', { ascending: true }),
        supabase.from('schedule_items').select('*').eq('module_id', moduleId).order('date', { ascending: true }).order('time', { ascending: true }),
        supabase.from('swap_history').select('*').eq('module_id', moduleId).order('changed_at', { ascending: false }),
        supabase.from('scale_pdf_history').select('*').eq('module_id', moduleId).order('generated_at', { ascending: false }),
      ]);

      if (membersResult.error) throw membersResult.error;
      if (memberFunctionsResult.error) throw memberFunctionsResult.error;
      if (eventRulesResult.error) throw eventRulesResult.error;
      if (scheduleResult.error) throw scheduleResult.error;
      if (historyResult.error) throw historyResult.error;
      if (pdfHistoryResult.error) throw pdfHistoryResult.error;

      const memberFunctionsMap = ((memberFunctionsResult.data ?? []) as MemberFunctionRow[]).reduce<Record<string, Member['functions']>>((acc, row) => {
        acc[row.member_id] = [...(acc[row.member_id] ?? []), row.function_key];
        return acc;
      }, {});

      setMembers(((membersResult.data ?? []) as MemberRow[]).map((row) => mapMemberRow(row, memberFunctionsMap[row.id] ?? [])));
      setEventRules(((eventRulesResult.data ?? []) as EventRuleRow[]).map(mapEventRuleRow));
      setSchedule(((scheduleResult.data ?? []) as ScheduleRow[]).map(mapScheduleRow));
      setHistory(((historyResult.data ?? []) as HistoryRow[]).map(mapHistoryRow));
      setScalePdfHistory(((pdfHistoryResult.data ?? []) as ScalePdfHistoryRow[]).map(mapScalePdfHistoryRow));
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao carregar dados do Supabase.';
      setErrorMessage(`Falha de rede ao carregar os dados do Supabase: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    void refreshAppData();
  }, [refreshAppData]);

  const withSupabase = useCallback(async <T,>(action: () => Promise<T>, fallbackMessage: string) => {
    if (!supabase) {
      setErrorMessage(fallbackMessage);
      return null;
    }

    try {
      const result = await action();
      setErrorMessage(null);
      return result;
    } catch (error) {
      console.error('Erro Supabase:', error);
      const message = error instanceof Error ? error.message : fallbackMessage;
      setErrorMessage(`${fallbackMessage} ${message}`.trim());
      return null;
    }
  }, []);

  const createMember = useCallback(async (member: Member) => {
    const normalizedMember: Member = {
      ...member,
      active: member.active ?? true,
      functions: member.functions ?? [],
      unavailability: member.unavailability ?? [],
    };

    const result = await withSupabase(async () => {
      try {
        const { error } = await supabase!.from('members').insert(mapMemberToRow(moduleId, normalizedMember));
        if (error) throw error;

        const memberFunctionsRows = buildMemberFunctionsRows(moduleId, normalizedMember);
        if (memberFunctionsRows.length > 0) {
          const { error: memberFunctionsError } = await supabase!.from('member_functions').insert(memberFunctionsRows);
          if (memberFunctionsError) throw memberFunctionsError;
        }
      } catch (error) {
        console.error('Erro ao adicionar integrante:', error);
        throw error;
      }

      return true;
    }, 'Não foi possível salvar o integrante no Supabase.');

    if (!result) {
      console.error('Erro ao adicionar integrante:', {
        member: normalizedMember,
        moduleId,
      });
      return false;
    }
    setMembers((current) => [...current, normalizedMember]);
    return true;
  }, [moduleId, withSupabase]);

  const saveMember = useCallback(async (member: Member) => {
    const normalizedMember: Member = {
      ...member,
      active: member.active ?? true,
      functions: member.functions ?? [],
      unavailability: member.unavailability ?? [],
    };

    const result = await withSupabase(async () => {
      try {
        const { error } = await supabase!
          .from('members')
          .update(mapMemberToRow(moduleId, normalizedMember))
          .eq('id', normalizedMember.id)
          .eq('module_id', moduleId);
        if (error) throw error;

        const { error: deleteFunctionsError } = await supabase!
          .from('member_functions')
          .delete()
          .eq('member_id', normalizedMember.id)
          .eq('module_id', moduleId);
        if (deleteFunctionsError) throw deleteFunctionsError;

        const memberFunctionsRows = buildMemberFunctionsRows(moduleId, normalizedMember);
        if (memberFunctionsRows.length > 0) {
          const { error: memberFunctionsError } = await supabase!.from('member_functions').insert(memberFunctionsRows);
          if (memberFunctionsError) throw memberFunctionsError;
        }
      } catch (error) {
        console.error('Erro ao salvar integrante:', error);
        throw error;
      }

      return true;
    }, 'Não foi possível atualizar o integrante no Supabase.');

    if (!result) {
      console.error('Erro ao salvar integrante:', {
        member: normalizedMember,
        moduleId,
      });
      return false;
    }
    setMembers((current) => current.map((item) => (item.id === normalizedMember.id ? normalizedMember : item)));
    return true;
  }, [moduleId, withSupabase]);

  const toggleMemberActive = useCallback(async (memberId: string) => {
    const selected = members.find((member) => member.id === memberId);
    if (!selected) return false;

    const wasSaved = await saveMember({ ...selected, active: !selected.active });
    if (!wasSaved) {
      console.error('Erro ao ativar/inativar integrante:', { memberId, moduleId });
    }
    return wasSaved;
  }, [members, moduleId, saveMember]);

  const deleteMember = useCallback(async (memberId: string) => {
    const result = await withSupabase(async () => {
      try {
        const { error: deleteFunctionsError } = await supabase!
          .from('member_functions')
          .delete()
          .eq('member_id', memberId)
          .eq('module_id', moduleId);
        if (deleteFunctionsError) throw deleteFunctionsError;

        const { error } = await supabase!.from('members').delete().eq('id', memberId).eq('module_id', moduleId);
        if (error) throw error;
      } catch (error) {
        console.error('Erro ao excluir integrante:', error);
        throw error;
      }

      return true;
    }, 'Não foi possível deletar o integrante no Supabase.');

    if (!result) {
      console.error('Erro ao excluir integrante:', { memberId, moduleId });
      return false;
    }
    setMembers((current) => current.filter((member) => member.id !== memberId));
    return true;
  }, [moduleId, withSupabase]);

  const createEventRule = useCallback(async (eventRule: EventRule) => {
    const normalizedEventRule = { ...eventRule, requiredMembers: getRequiredMembersCount(eventRule) };
    const result = await withSupabase(async () => {
      const { error } = await supabase!.from('event_rules').insert(mapEventRuleToRow(moduleId, normalizedEventRule));
      if (error) throw error;
      return true;
    }, 'Não foi possível salvar o evento no Supabase.');

    if (!result) return false;
    setEventRules((current) => [...current, normalizedEventRule]);
    return true;
  }, [moduleId, withSupabase]);

  const deleteEventRule = useCallback(async (eventId: string) => {
    const result = await withSupabase(async () => {
      const { error } = await supabase!.from('event_rules').delete().eq('id', eventId).eq('module_id', moduleId);
      if (error) throw error;
      return true;
    }, 'Não foi possível deletar o evento no Supabase.');

    if (!result) return false;
    setEventRules((current) => current.filter((item) => item.id !== eventId));
    return true;
  }, [moduleId, withSupabase]);

  const addHistory = useCallback(async (entry: SwapHistory) => {
    const persisted = await withSupabase(async () => {
      const { error } = await supabase!.from('swap_history').insert(mapHistoryToRow(moduleId, entry));
      if (error) throw error;
      return true;
    }, 'Não foi possível salvar o histórico no Supabase.');

    if (!persisted) return false;
    setHistory((current) => [entry, ...current]);
    return true;
  }, [moduleId, withSupabase]);

  const generateSchedule = useCallback(async (startDate: string, endDate: string) => {
    const result = buildSchedule({ members, eventRules, startDate, endDate });

    const { pdfDataUrl, fileName } = buildSchedulePdf(result.schedule, members, startDate, endDate);
    const usedMembers = new Set(result.schedule.flatMap((item) => item.memberIds));
    const status = result.schedule.some((item) => item.memberIds.length < item.requiredMembers) ? 'incompleta' : 'completa';

    const record: ScalePdfHistoryRecord = {
      id: `pdf-history-${crypto.randomUUID()}`,
      moduleId,
      fileName,
      generatedAt: new Date().toISOString(),
      periodStart: startDate,
      periodEnd: endDate,
      eventsCount: result.schedule.length,
      usedMembersCount: usedMembers.size,
      status,
      pdfDataUrl,
    };

    const persisted = await withSupabase(async () => {
      const { error: deleteError } = await supabase!.from('schedule_items').delete().eq('module_id', moduleId);
      if (deleteError) throw deleteError;

      if (result.schedule.length > 0) {
        const { error: insertError } = await supabase!.from('schedule_items').insert(result.schedule.map((item) => mapScheduleToRow(moduleId, item)));
        if (insertError) throw insertError;
      }

      const { error: pdfError } = await supabase!.from('scale_pdf_history').insert(mapScalePdfHistoryToRow(moduleId, record));
      if (pdfError) throw pdfError;

      return true;
    }, 'Não foi possível salvar a escala no Supabase.');

    if (!persisted) return false;

    setSchedule(result.schedule);
    setScalePdfHistory((current) => {
      const updated = [record, ...current];
      persistPdfHistory(moduleId, updated);
      return updated;
    });
    return true;
  }, [eventRules, members, moduleId, withSupabase]);

  const updateScheduleMembers = useCallback(async (scheduleId: string, memberIds: string[], reason?: string, memberAssignments?: ScheduleAssignment[]) => {
    const scheduleItem = schedule.find((s) => s.id === scheduleId);
    if (!scheduleItem) return false;

    const sourceRule = eventRules.find((eventRule) => eventRule.id === scheduleItem.eventRuleId);
    const assignmentSource = sourceRule
      ? sourceRule
      : { requiredMembers: scheduleItem.requiredMembers, roleRequirements: [] };
    const nextAssignments = memberAssignments ?? buildAssignmentsFromSelectedMembers(
      assignmentSource,
      memberIds,
      members,
      scheduleItem.memberAssignments ?? []
    );
    const nextMemberIds = nextAssignments.map((assignment) => assignment.memberId);

    const updatedItem: ScheduleItem = {
      ...scheduleItem,
      memberIds: nextMemberIds,
      memberAssignments: nextAssignments,
      status: nextMemberIds.length < scheduleItem.requiredMembers ? 'pendente' : 'alterado',
    };

    const historyEntry: SwapHistory = {
      id: `history-${crypto.randomUUID()}`,
      changedAt: new Date().toISOString(),
      changedBy: 'Admin',
      eventDate: scheduleItem.date,
      eventTime: scheduleItem.time,
      eventName: scheduleItem.eventName,
      originalMemberId: scheduleItem.memberIds[0],
      substituteMemberId: nextMemberIds[0],
      reason: reason ?? 'Ajuste manual de escala',
    };

    const persisted = await withSupabase(async () => {
      const { error: scheduleError } = await supabase!
        .from('schedule_items')
        .update(mapScheduleToRow(moduleId, updatedItem))
        .eq('id', scheduleId)
        .eq('module_id', moduleId);
      if (scheduleError) throw scheduleError;

      const { error: historyError } = await supabase!.from('swap_history').insert(mapHistoryToRow(moduleId, historyEntry));
      if (historyError) throw historyError;

      return true;
    }, 'Não foi possível atualizar a escala no Supabase.');

    if (!persisted) return false;

    setSchedule((current) => current.map((item) => (item.id === scheduleId ? updatedItem : item)));
    setHistory((current) => [historyEntry, ...current]);
    return true;
  }, [eventRules, members, moduleId, schedule, withSupabase]);

  const updateEventRule = useCallback(async (eventId: string, patch: Partial<EventRule>, mode: 'proximas' | 'atual') => {
    const currentRule = eventRules.find((eventRule) => eventRule.id === eventId);
    if (!currentRule) return false;

    const nextRule: EventRule = { ...currentRule, ...patch, requiredMembers: getRequiredMembersCount({ ...currentRule, ...patch }) };

    const updatedSchedule = mode === 'atual'
      ? schedule.map((item) => {
          if (item.eventRuleId !== eventId) return item;
          const adjustedRule = { ...nextRule, requiredMembers: getRequiredMembersCount(nextRule) };
          const nextRequired = adjustedRule.requiredMembers;
          const nextDate = patch.date ?? item.date;
          const nextAssignments = buildAssignmentsFromSelectedMembers(adjustedRule, item.memberIds, members, item.memberAssignments ?? []);
          const nextMemberIds = nextAssignments.map((assignment) => assignment.memberId);
          return {
            ...item,
            eventName: patch.name ?? item.eventName,
            time: patch.time ?? item.time,
            date: nextDate,
            weekday: patch.date ? getWeekDay(new Date(patch.date)) : item.weekday,
            memberIds: nextMemberIds,
            memberAssignments: nextAssignments,
            requiredMembers: nextRequired,
            status: nextMemberIds.length < nextRequired ? 'pendente' : item.status,
          };
        })
      : schedule;

    const persisted = await withSupabase(async () => {
      const { error: eventError } = await supabase!
        .from('event_rules')
        .update(mapEventRuleToRow(moduleId, nextRule))
        .eq('id', eventId)
        .eq('module_id', moduleId);
      if (eventError) throw eventError;

      if (mode === 'atual') {
        const rowsToUpdate = updatedSchedule
          .filter((item) => item.eventRuleId === eventId)
          .map((item) => mapScheduleToRow(moduleId, item));

        if (rowsToUpdate.length > 0) {
          const { error: scheduleError } = await supabase!.from('schedule_items').upsert(rowsToUpdate);
          if (scheduleError) throw scheduleError;
        }
      }

      return true;
    }, 'Não foi possível atualizar o evento no Supabase.');

    if (!persisted) return false;

    setEventRules((current) => current.map((eventRule) => (eventRule.id === eventId ? nextRule : eventRule)));

    if (mode === 'atual') {
      setSchedule(updatedSchedule);
    }
    return true;
  }, [eventRules, moduleId, schedule, withSupabase]);

  const deleteScalePdfHistory = useCallback(async (recordId: string) => {
    const persisted = await withSupabase(async () => {
      const { error } = await supabase!.from('scale_pdf_history').delete().eq('id', recordId).eq('module_id', moduleId);
      if (error) throw error;
      return true;
    }, 'Não foi possível deletar o histórico de PDF no Supabase.');

    if (!persisted) return false;

    setScalePdfHistory((current) => {
      const updated = current.filter((item) => item.id !== recordId);
      persistPdfHistory(moduleId, updated);
      return updated;
    });
    return true;
  }, [moduleId, withSupabase]);

  const value = useMemo(
    () => ({
      moduleId,
      members,
      eventRules,
      schedule,
      history,
      scalePdfHistory,
      alerts,
      isLoading,
      errorMessage,
      defaultPeriod,
      refreshAppData,
      createMember,
      saveMember,
      toggleMemberActive,
      deleteMember,
      createEventRule,
      deleteEventRule,
      generateSchedule,
      updateEventRule,
      updateScheduleMembers,
      deleteScalePdfHistory,
      addHistory,
    }),
    [
      moduleId,
      members,
      eventRules,
      schedule,
      history,
      scalePdfHistory,
      alerts,
      isLoading,
      errorMessage,
      defaultPeriod,
      refreshAppData,
      createMember,
      saveMember,
      toggleMemberActive,
      deleteMember,
      createEventRule,
      deleteEventRule,
      generateSchedule,
      updateEventRule,
      updateScheduleMembers,
      deleteScalePdfHistory,
      addHistory,
    ]
  );

  return (
    <AppStateContext.Provider value={value}>
      {isLoading ? (
        <div className="container">
          <main className="page-content">
            <section className="page-section">
              <div className="card">
                <h1 style={{ marginTop: 0 }}>Carregando dados</h1>
                <p>Buscando integrantes, eventos, escala e histórico do módulo no Supabase.</p>
              </div>
            </section>
          </main>
        </div>
      ) : errorMessage && members.length === 0 && eventRules.length === 0 && schedule.length === 0 && history.length === 0 ? (
        <div className="container">
          <main className="page-content">
            <section className="page-section">
              <div className="card">
                <h1 style={{ marginTop: 0 }}>Falha ao carregar dados</h1>
                <AlertBanner message={errorMessage} />
                <button type="button" className="button" onClick={() => void refreshAppData()}>
                  Tentar novamente
                </button>
              </div>
            </section>
          </main>
        </div>
      ) : (
        <>
          {errorMessage ? (
            <div style={{ padding: '16px 16px 0' }}>
              <AlertBanner message={errorMessage} />
            </div>
          ) : null}
          {children}
        </>
      )}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppStateContext);
}
