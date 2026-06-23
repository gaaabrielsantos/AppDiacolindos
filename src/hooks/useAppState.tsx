import { createContext, useContext, useMemo, useState } from 'react';
import { mockEventRules, mockHistory, mockMembers } from '../data/mockData';
import { EventRule, Member, ScheduleItem, SwapHistory } from '../types';
import { buildSchedule } from '../utils/generator';
import { nextQuarterRange } from '../utils/date';

interface AppStateContext {
  members: Member[];
  eventRules: EventRule[];
  schedule: ScheduleItem[];
  history: SwapHistory[];
  alerts: string[];
  defaultPeriod: { startDate: string; endDate: string };
  generateSchedule: (startDate: string, endDate: string) => void;
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  setEventRules: React.Dispatch<React.SetStateAction<EventRule[]>>;
  updateScheduleMembers: (scheduleId: string, memberIds: string[], reason?: string) => void;
  addHistory: (entry: SwapHistory) => void;
}

const fallbackPeriod = nextQuarterRange();

const defaultContext: AppStateContext = {
  members: [],
  eventRules: [],
  schedule: [],
  history: [],
  alerts: [],
  defaultPeriod: { startDate: fallbackPeriod.start, endDate: fallbackPeriod.end },
  generateSchedule: () => {},
  setMembers: () => {},
  setEventRules: () => {},
  updateScheduleMembers: () => {},
  addHistory: () => {},
};

const AppStateContext = createContext<AppStateContext>(defaultContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>(mockMembers);
  const [eventRules, setEventRules] = useState<EventRule[]>(mockEventRules);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [history, setHistory] = useState<SwapHistory[]>(mockHistory);
  const [alerts, setAlerts] = useState<string[]>([]);

  const defaultPeriod = useMemo(() => {
    const range = nextQuarterRange();
    return { startDate: range.start, endDate: range.end };
  }, []);

  const generateSchedule = (startDate: string, endDate: string) => {
    const result = buildSchedule({ members, eventRules, startDate, endDate });
    setSchedule(result.schedule);
    setAlerts(result.alerts);
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

  const value = useMemo(
    () => ({
      members,
      eventRules,
      schedule,
      history,
      alerts,
      defaultPeriod,
      generateSchedule,
      setMembers,
      setEventRules,
      updateScheduleMembers,
      addHistory,
    }),
    [members, eventRules, schedule, history, alerts, defaultPeriod]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  return useContext(AppStateContext);
}
