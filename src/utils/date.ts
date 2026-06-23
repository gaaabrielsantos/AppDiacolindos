import { WeekDay } from '../types';

const dayMap: Record<number, WeekDay> = {
  0: 'domingo',
  1: 'segunda',
  2: 'terca',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sabado',
};

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getWeekDay(date: Date): WeekDay {
  return dayMap[date.getDay()];
}

export function isDateBetween(candidate: string, from: string, to: string) {
  const target = new Date(candidate).getTime();
  return new Date(from).getTime() <= target && target <= new Date(to).getTime();
}

export function nextQuarterRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 3);
  return { start: formatDate(start), end: formatDate(end) };
}

export function datesInRange(startDate: string, endDate: string): Date[] {
  const result: Date[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    result.push(new Date(date));
  }
  return result;
}
