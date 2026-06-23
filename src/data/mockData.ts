import { EventRule, Member, SwapHistory } from '../types';

export const mockMembers: Member[] = [
  { id: 'member-1', name: 'Gabriel', active: true, eventAvailability: [], dateExceptions: [] },
  { id: 'member-2', name: 'Nathan', active: true, eventAvailability: [], dateExceptions: [] },
  { id: 'member-3', name: 'Italo', active: true, eventAvailability: [], dateExceptions: [] },
  { id: 'member-4', name: 'Kim', active: true, eventAvailability: [], dateExceptions: [] },
  { id: 'member-5', name: 'Daniel', active: true, eventAvailability: [], dateExceptions: [] },
  { id: 'member-6', name: 'Sid', active: true, eventAvailability: [], dateExceptions: [] },
  { id: 'member-7', name: 'Cadu', active: true, eventAvailability: [], dateExceptions: [] },
  { id: 'member-8', name: 'Eduardo', active: true, eventAvailability: [], dateExceptions: [] },
  { id: 'member-9', name: 'Alessandro', active: true, eventAvailability: [], dateExceptions: [] },
  { id: 'member-10', name: 'Matheus', active: true, eventAvailability: [], dateExceptions: [] },
  { id: 'member-11', name: 'Marcelo', active: true, eventAvailability: [], dateExceptions: [] },
  { id: 'member-12', name: 'Lino', active: true, eventAvailability: [], dateExceptions: [] },
  { id: 'member-13', name: 'Cesar', active: true, eventAvailability: [], dateExceptions: [] },
];

export const mockEventRules: EventRule[] = [
  {
    id: 'event-1',
    name: 'Culto da Manhã',
    weekday: 'domingo',
    time: '09:00',
    recurrence: 'semanal',
    requiredMembers: 4,
  },
  {
    id: 'event-2',
    name: 'Culto da Noite',
    weekday: 'domingo',
    time: '19:00',
    recurrence: 'semanal',
    requiredMembers: 5,
  },
  {
    id: 'event-3',
    name: 'Culto de Quinta',
    weekday: 'quinta',
    time: '20:00',
    recurrence: 'semanal',
    requiredMembers: 3,
  },
];

export const mockHistory: SwapHistory[] = [];
