import { createContext, useContext, useMemo, useState } from 'react';
import { mockEventRules, mockHistory, mockMembers } from '../data/mockData';
import { EventRule, Member, ScalePdfHistoryRecord, ScheduleItem, SwapHistory } from '../types';
import { buildSchedule } from '../utils/generator';
import { getWeekDay, nextQuarterRange } from '../utils/date';
import { buildSchedulePdf } from '../utils/schedulePdf';

interface AppStateContext {
  members: Member[];
  eventRules: EventRule[];
  schedule: ScheduleItem[];
  history: SwapHistory[];
  scalePdfHistory: ScalePdfHistoryRecord[];
  alerts: string[];
  defaultPeriod: { startDate: string; endDate: string };
  generateSchedule: (startDate: string, endDate: string) => void;
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  setEventRules: React.Dispatch<React.SetStateAction<EventRule[]>>;
  updateEventRule: (eventId: string, patch: Partial<EventRule>, mode: 'proximas' | 'atual') => void;
  updateScheduleMembers: (scheduleId: string, memberIds: string[], reason?: string) => void;
  deleteScalePdfHistory: (recordId: string) => void;
  addHistory: (entry: SwapHistory) => void;
}

const fallbackPeriod = nextQuarterRange();

const defaultContext: AppStateContext = {
  members: [],
  eventRules: [],
  schedule: [],
  history: [],
  scalePdfHistory: [],
  alerts: [],
  defaultPeriod: { startDate: fallbackPeriod.start, endDate: fallbackPeriod.end },
  generateSchedule: () => {},
  setMembers: () => {},
  setEventRules: () => {},
  updateEventRule: () => {},
  updateScheduleMembers: () => {},
  deleteScalePdfHistory: () => {},
  addHistory: () => {},
};

const AppStateContext = createContext<AppStateContext>(defaultContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>(mockMembers);
  const [eventRules, setEventRules] = useState<EventRule[]>(mockEventRules);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [history, setHistory] = useState<SwapHistory[]>(mockHistory);
  const [scalePdfHistory, setScalePdfHistory] = useState<ScalePdfHistoryRecord[]>(() => {
    try {
      const raw = localStorage.getItem('diacolindos-scale-pdf-history');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ScalePdfHistoryRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [alerts, setAlerts] = useState<string[]>([]);

  const defaultPeriod = useMemo(() => {
    const range = nextQuarterRange();
    return { startDate: range.start, endDate: range.end };
  }, []);

  const generateSchedule = (startDate: string, endDate: string) => {
    const result = buildSchedule({ members, eventRules, startDate, endDate });
    setSchedule(result.schedule);
    setAlerts(result.alerts);

    const { pdfDataUrl, fileName } = buildSchedulePdf(result.schedule, members, startDate, endDate);
    const usedMembers = new Set(result.schedule.flatMap((item) => item.memberIds));
    const status = result.schedule.some((item) => item.memberIds.length < item.requiredMembers) ? 'incompleta' : 'completa';

    const record: ScalePdfHistoryRecord = {
      id: `pdf-history-${crypto.randomUUID()}`,
      fileName,
      generatedAt: new Date().toISOString(),
      periodStart: startDate,
      periodEnd: endDate,
      eventsCount: result.schedule.length,
      usedMembersCount: usedMembers.size,
      status,
      pdfDataUrl,
    };

    setScalePdfHistory((current) => {
      const updated = [record, ...current];
      localStorage.setItem('diacolindos-scale-pdf-history', JSON.stringify(updated));
      return updated;
    });
  };

  const addHistory = (entry: SwapHistory) => {
    setHistory((current) => [entry, ...current]);
  };

  const updateScheduleMembers = (scheduleId: string, memberIds: string[], reason?: string) => {
    setSchedule((current) => current.map((item) => {
      if (item.id !== scheduleId) return item;
      return {
        ...item,
        memberIds,
        status: memberIds.length < item.requiredMembers ? 'pendente' : 'alterado',
      };
    }));
    const scheduleItem = schedule.find((s) => s.id === scheduleId);
    if (scheduleItem) {
      addHistory({
        id: `history-${crypto.randomUUID()}`,
        changedAt: new Date().toISOString(),
        changedBy: 'Admin',
        eventDate: scheduleItem.date,
        eventTime: scheduleItem.time,
        eventName: scheduleItem.eventName,
        originalMemberId: scheduleItem.memberIds[0],
        substituteMemberId: memberIds[0],
        reason: reason ?? 'Ajuste manual de escala',
      });
    }
  };

  const updateEventRule = (eventId: string, patch: Partial<EventRule>, mode: 'proximas' | 'atual') => {
    setEventRules((current) => current.map((eventRule) => (eventRule.id === eventId ? { ...eventRule, ...patch } : eventRule)));

    if (mode === 'atual') {
      setSchedule((current) => current.map((item) => {
        if (item.eventRuleId !== eventId) return item;
        const nextRequired = patch.requiredMembers ?? item.requiredMembers;
        const nextDate = patch.date ?? item.date;
        return {
          ...item,
          eventName: patch.name ?? item.eventName,
          time: patch.time ?? item.time,
          date: nextDate,
          weekday: patch.date ? getWeekDay(new Date(patch.date)) : item.weekday,
          requiredMembers: nextRequired,
          status: item.memberIds.length < nextRequired ? 'pendente' : item.status,
        };
      }));
    }
  };

  const deleteScalePdfHistory = (recordId: string) => {
    setScalePdfHistory((current) => {
      const updated = current.filter((item) => item.id !== recordId);
      localStorage.setItem('diacolindos-scale-pdf-history', JSON.stringify(updated));
      return updated;
    });
  };

  const value = useMemo(
    () => ({
      members,
      eventRules,
      schedule,
      history,
      scalePdfHistory,
      alerts,
      defaultPeriod,
      generateSchedule,
      setMembers,
      setEventRules,
      updateEventRule,
      updateScheduleMembers,
      deleteScalePdfHistory,
      addHistory,
    }),
    [members, eventRules, schedule, history, scalePdfHistory, alerts, defaultPeriod]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  return useContext(AppStateContext);
}
