import { EventRule, Member, SwapHistory } from '../types';

export const mockMembers: Member[] = [
  { id: 'member-1', name: 'Gabriel', active: true, unavailability: [] },
  { id: 'member-2', name: 'Nathan', active: true, unavailability: [] },
  { id: 'member-3', name: 'Italo', active: true, unavailability: [] },
  { id: 'member-4', name: 'Kim', active: true, unavailability: [] },
  { id: 'member-5', name: 'Daniel', active: true, unavailability: [] },
  { id: 'member-6', name: 'Sid', active: true, unavailability: [] },
  { id: 'member-7', name: 'Cadu', active: true, unavailability: [] },
  { id: 'member-8', name: 'Eduardo', active: true, unavailability: [] },
  { id: 'member-9', name: 'Alessandro', active: true, unavailability: [] },
  { id: 'member-10', name: 'Matheus', active: true, unavailability: [] },
  { id: 'member-11', name: 'Marcelo', active: true, unavailability: [] },
  { id: 'member-12', name: 'Lino', active: true, unavailability: [] },
  { id: 'member-13', name: 'Cesar', active: true, unavailability: [] },
];

export const mockEventRules: EventRule[] = [
  {
    id: 'event-1',
    name: 'EBD',
    type: 'recorrente',
    active: true,
    weekday: 'domingo',
    time: '09:00',
    recurrence: 'semanal',
    requiredMembers: 2,
  },
  {
    id: 'event-2',
    name: 'Culto Dominical',
    type: 'recorrente',
    active: true,
    weekday: 'domingo',
    time: '19:00',
    recurrence: 'semanal',
    requiredMembers: 3,
  },
  {
    id: 'event-3',
    name: 'GOCC',
    type: 'recorrente',
    active: true,
    weekday: 'quinta',
    time: '19:30',
    recurrence: 'semanal',
    requiredMembers: 2,
  },
];

export const mockHistory: SwapHistory[] = [];
