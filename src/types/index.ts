export type WeekDay = 'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado';

export interface DateException {
  id: string;
  from: string;
  to: string;
  note?: string;
}

export interface Member {
  id: string;
  name: string;
  nickname?: string;
  phone?: string;
  email?: string;
  active: boolean;
  eventAvailability: string[];
  dateExceptions: DateException[];
  notes?: string;
}

export interface EventRule {
  id: string;
  name: string;
  weekday: WeekDay;
  time: string;
  recurrence: 'semanal' | 'mensal' | 'unico';
  dayOfMonth?: number;
  requiredMembers: number;
  notes?: string;
}

export interface ScheduleItem {
  id: string;
  eventRuleId: string;
  date: string;
  weekday: WeekDay;
  time: string;
  eventName: string;
  memberIds: string[];
  requiredMembers: number;
  status: 'confirmado' | 'pendente' | 'alterado';
}

export interface SwapHistory {
  id: string;
  changedAt: string;
  changedBy: string;
  eventDate: string;
  eventTime: string;
  eventName: string;
  originalMemberId?: string;
  substituteMemberId?: string;
  reason?: string;
}

export interface SummaryCard {
  title: string;
  value: string;
  description?: string;
}
