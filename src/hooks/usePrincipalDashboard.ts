import { useCallback, useEffect, useMemo, useState } from 'react';
import { APP_MODULE_IDS, AppModuleId, MODULE_LABELS } from '../config/modules';
import { Member, ScheduleItem } from '../types';
import { nextQuarterRange } from '../utils/date';
import { isSupabaseConfigured, supabase } from '../services/supabase';

type MemberRow = Member & { module_id: AppModuleId };

type MemberFunctionRow = {
  module_id: AppModuleId;
  member_id: string;
  function_key: NonNullable<Member['functions']>[number];
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

export interface PrincipalModuleSchedule {
  moduleId: AppModuleId;
  moduleLabel: string;
  members: Member[];
  schedule: ScheduleItem[];
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

export function usePrincipalDashboard() {
  const defaultPeriod = useMemo(() => {
    const range = nextQuarterRange();
    return { startDate: range.start, endDate: range.end };
  }, []);
  const [modulesData, setModulesData] = useState<PrincipalModuleSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      setModulesData([]);
      setErrorMessage('Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para carregar a dashboard principal.');
      setIsLoading(false);
      return;
    }

    try {
      const [membersResult, memberFunctionsResult, scheduleResult] = await Promise.all([
        supabase.from('members').select('*').in('module_id', [...APP_MODULE_IDS]).order('name', { ascending: true }),
        supabase.from('member_functions').select('*').in('module_id', [...APP_MODULE_IDS]),
        supabase.from('schedule_items').select('*').in('module_id', [...APP_MODULE_IDS]).order('date', { ascending: true }).order('time', { ascending: true }),
      ]);

      if (membersResult.error) throw membersResult.error;
      if (memberFunctionsResult.error) throw memberFunctionsResult.error;
      if (scheduleResult.error) throw scheduleResult.error;

      const memberFunctionsMap = ((memberFunctionsResult.data ?? []) as MemberFunctionRow[]).reduce<Record<string, Member['functions']>>((acc, row) => {
        const key = `${row.module_id}:${row.member_id}`;
        acc[key] = [...(acc[key] ?? []), row.function_key];
        return acc;
      }, {});

      const membersByModule = APP_MODULE_IDS.reduce<Record<AppModuleId, Member[]>>((acc, moduleId) => {
        acc[moduleId] = [];
        return acc;
      }, {} as Record<AppModuleId, Member[]>);

      ((membersResult.data ?? []) as MemberRow[]).forEach((row) => {
        membersByModule[row.module_id].push(mapMemberRow(row, memberFunctionsMap[`${row.module_id}:${row.id}`] ?? []));
      });

      const scheduleByModule = APP_MODULE_IDS.reduce<Record<AppModuleId, ScheduleItem[]>>((acc, moduleId) => {
        acc[moduleId] = [];
        return acc;
      }, {} as Record<AppModuleId, ScheduleItem[]>);

      ((scheduleResult.data ?? []) as ScheduleRow[]).forEach((row) => {
        scheduleByModule[row.module_id].push(mapScheduleRow(row));
      });

      setModulesData(
        APP_MODULE_IDS.map((moduleId) => ({
          moduleId,
          moduleLabel: MODULE_LABELS[moduleId],
          members: membersByModule[moduleId],
          schedule: scheduleByModule[moduleId].sort((left, right) => {
            const dateDiff = left.date.localeCompare(right.date);
            if (dateDiff !== 0) return dateDiff;
            return left.time.localeCompare(right.time);
          }),
        }))
      );
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao carregar os dados consolidados.';
      setModulesData([]);
      setErrorMessage(`Falha ao carregar os dados da dashboard principal: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  return {
    modulesData,
    isLoading,
    errorMessage,
    defaultPeriod,
    refreshData,
  };
}