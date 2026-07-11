import { EventRule, Member, ScheduleItem } from '../types';
import { datesInRange, formatDate, getWeekDay } from './date';
import {
  buildRoleSlots,
  formatRoleRequirements,
  getRequiredMembersCount,
  isMemberAvailableForEvent,
  memberHasFunction,
  ScheduleAssignment,
} from './scheduleFunctions';

interface BuildSchedulePayload {
  members: Member[];
  eventRules: EventRule[];
  startDate: string;
  endDate: string;
}

export function buildSchedule(payload: BuildSchedulePayload) {
  const { members, eventRules, startDate, endDate } = payload;
  const alerts: string[] = [];
  const eventDates = expandEvents(eventRules, startDate, endDate).sort((a, b) => {
    const dateDiff = a.date.localeCompare(b.date);
    if (dateDiff !== 0) return dateDiff;
    return a.time.localeCompare(b.time);
  });
  const participationCount: Record<string, number> = {};
  const lastAssignedDate: Record<string, string | undefined> = {};
  const activeMembers = members.filter((member) => member.active);

  activeMembers.forEach((member) => {
    participationCount[member.id] = 0;
    lastAssignedDate[member.id] = undefined;
  });

  const schedule: ScheduleItem[] = eventDates.map((event) => {
    const requiredMembers = getRequiredMembersCount(event);
    const { chosenIds, assignments } = assignMembersToEvent(event, activeMembers, participationCount, lastAssignedDate);

    const incomplete = chosenIds.length < requiredMembers;
    if (incomplete) {
      const roleSummary = formatRoleRequirements(event);
      const detail = roleSummary ? ` Requisitos: ${roleSummary}.` : '';
      alerts.push(`Escala incompleta em ${event.name} (${event.date} ${event.time}): necessários ${requiredMembers}, disponíveis ${chosenIds.length}.${detail}`);
    }

    return {
      id: `schedule-${event.id}-${event.date}-${event.time}`,
      eventRuleId: event.id,
      date: event.date,
      weekday: event.weekday,
      time: event.time,
      eventName: event.name,
      memberIds: chosenIds,
      memberAssignments: assignments,
      requiredMembers,
      status: incomplete ? 'pendente' : 'confirmado',
    };
  });

  return { schedule, alerts, participationCount };
}

function expandEvents(eventRules: EventRule[], startDate: string, endDate: string) {
  return datesInRange(startDate, endDate).flatMap((date) => {
    const weekday = getWeekDay(date);
    return eventRules
      .filter((rule) => {
        if (rule.active === false) return false;
        const currentDate = formatDate(date);

        if (rule.type === 'especifico') {
          return rule.date === currentDate;
        }

        if (rule.recurrence === 'nenhuma') {
          return rule.date === currentDate;
        }

        if (rule.recurrence === 'semanal') return rule.weekday === weekday;
        if (rule.recurrence === 'mensal' && rule.dayOfMonth) return rule.dayOfMonth === date.getDate();
        if (rule.recurrence === 'anual' && rule.date) {
          const baseDate = new Date(rule.date);
          return currentDate >= rule.date && baseDate.getDate() === date.getDate() && baseDate.getMonth() === date.getMonth();
        }
        return false;
      })
      .map((rule) => ({
        ...rule,
        date: formatDate(date),
        weekday,
      }));
  });
}

function assignMembersToEvent(
  event: EventRule & { date: string },
  activeMembers: Member[],
  participationCount: Record<string, number>,
  lastAssignedDate: Record<string, string | undefined>
) {
  const eligible = activeMembers.filter((member) => isMemberAvailableForEvent(member, event.id, event.date));
  const roleSlots = buildRoleSlots(event);

  if (roleSlots.length === 0) {
    const chosenIds: string[] = [];

    while (chosenIds.length < event.requiredMembers) {
      const availableNow = eligible.filter((member) => !chosenIds.includes(member.id));
      if (availableNow.length === 0) break;

      const chosen = balancedRandomPick(availableNow, participationCount, lastAssignedDate, activeMembers, event.date);
      if (!chosen) break;
      chosenIds.push(chosen.id);
      participationCount[chosen.id] += 1;
      lastAssignedDate[chosen.id] = event.date;
    }

    return {
      chosenIds,
      assignments: chosenIds.map((memberId) => ({ memberId })),
    };
  }

  const chosenIds: string[] = [];
  const assignments: ScheduleAssignment[] = [];
  const sortedRoleSlots = [...roleSlots].sort((left, right) => {
    const leftCount = eligible.filter((member) => memberHasFunction(member, left)).length;
    const rightCount = eligible.filter((member) => memberHasFunction(member, right)).length;
    return leftCount - rightCount;
  });

  sortedRoleSlots.forEach((functionKey) => {
    const availableNow = eligible.filter((member) => !chosenIds.includes(member.id) && memberHasFunction(member, functionKey));
    if (availableNow.length === 0) return;

    const chosen = balancedRandomPick(availableNow, participationCount, lastAssignedDate, activeMembers, event.date);
    if (!chosen) return;

    chosenIds.push(chosen.id);
    assignments.push({ memberId: chosen.id, functionKey });
    participationCount[chosen.id] += 1;
    lastAssignedDate[chosen.id] = event.date;
  });

  return { chosenIds, assignments };
}

function balancedRandomPick(
  candidates: Member[],
  participationCount: Record<string, number>,
  lastAssignedDate: Record<string, string | undefined>,
  activeMembers: Member[],
  eventDate: string
) {
  if (candidates.length === 0) return undefined;

  const activeCounts = activeMembers.map((member) => participationCount[member.id] ?? 0);
  const globalMin = Math.min(...activeCounts);
  const cap = globalMin + 1;

  // Evita escalar quem já está acima do limite de equilíbrio quando existe alternativa.
  const cappedCandidates = candidates.filter((member) => (participationCount[member.id] ?? 0) <= cap);
  const pool = cappedCandidates.length > 0 ? cappedCandidates : candidates;

  // Sorteio acontece somente entre integrantes com menor participação no grupo atual.
  const minPoolCount = Math.min(...pool.map((member) => participationCount[member.id] ?? 0));
  const leastGroup = pool.filter((member) => (participationCount[member.id] ?? 0) === minPoolCount);

  const weights = leastGroup.map((member) => {
    const penalty = proximityPenalty(lastAssignedDate[member.id], eventDate);
    // Peso maior para quem não foi escalado recentemente.
    const weight = 1 / (1 + penalty);
    return { member, weight };
  });

  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return candidates[Math.floor(Math.random() * candidates.length)];

  let random = Math.random() * totalWeight;
  for (const item of weights) {
    random -= item.weight;
    if (random <= 0) return item.member;
  }

  return weights[weights.length - 1]?.member;
}

function proximityPenalty(lastDate?: string, currentDate?: string) {
  if (!lastDate || !currentDate) return 0;
  const diffMs = Math.abs(new Date(currentDate).getTime() - new Date(lastDate).getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) return 3;
  if (diffDays <= 3) return 1;
  return 0;
}
