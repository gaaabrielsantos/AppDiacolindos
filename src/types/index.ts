export type WeekDay = 'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado';

export interface Unavailability {
  id: string;
  type: 'evento' | 'data' | 'periodo';
  eventId?: string;
  date?: string;
  from?: string;
  to?: string;
  note?: string;
}

export interface Member {
  id: string;
  name: string;
  nickname?: string;
  phone?: string;
  active: boolean;
  unavailability: Unavailability[];
  notes?: string;
}

export interface EventRule {
  id: string;
  name: string;
  type: 'recorrente' | 'especifico';
  active?: boolean;
  date?: string;
  weekday: WeekDay;
  time: string;
  recurrence: 'nenhuma' | 'semanal' | 'mensal' | 'anual';
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

export interface ScalePdfHistoryRecord {
  id: string;
  fileName: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  eventsCount: number;
  usedMembersCount: number;
  status: 'completa' | 'incompleta';
  pdfDataUrl: string;
}
