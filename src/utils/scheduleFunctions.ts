import type { AppModuleId, EventRule, Member, ScheduleItem } from '../types';
import { getModuleFunctionConfig, getTeamFunctionLabel, TeamFunctionKey } from '../config/moduleFunctions';
import { isDateBetween } from './date';

export interface EventRoleRequirement {
  functionKey: TeamFunctionKey;
  quantity: number;
}

export interface ScheduleAssignment {
  memberId: string;
  functionKey?: TeamFunctionKey;
}

export function getActiveRoleRequirements(eventRule: Pick<EventRule, 'roleRequirements'>) {
  return (eventRule.roleRequirements ?? []).filter((item) => item.quantity > 0);
}

export function getRequiredMembersCount(eventRule: Pick<EventRule, 'requiredMembers' | 'roleRequirements'>) {
  const requirements = getActiveRoleRequirements(eventRule);
  if (requirements.length === 0) return eventRule.requiredMembers;
  return requirements.reduce((sum, item) => sum + item.quantity, 0);
}

export function memberHasFunction(member: Member, functionKey: TeamFunctionKey) {
  return (member.functions ?? []).includes(functionKey);
}

export function isMemberAvailableForEvent(member: Member, eventId: string, date: string) {
  if (!member.active) return false;
  if (!member.unavailability || member.unavailability.length === 0) return true;

  for (const item of member.unavailability) {
    if (item.type === 'evento' && item.eventId === eventId) return false;
    if (item.type === 'data' && item.date === date) return false;
    if (item.type === 'periodo' && item.from && item.to && isDateBetween(date, item.from, item.to)) return false;
  }

  return true;
}

export function buildRoleSlots(eventRule: Pick<EventRule, 'roleRequirements'>) {
  const slots: TeamFunctionKey[] = [];

  getActiveRoleRequirements(eventRule).forEach((requirement) => {
    for (let index = 0; index < requirement.quantity; index += 1) {
      slots.push(requirement.functionKey);
    }
  });

  return slots;
}

export function formatRoleRequirements(eventRule: Pick<EventRule, 'roleRequirements'>) {
  const requirements = getActiveRoleRequirements(eventRule);
  if (requirements.length === 0) return '';
  return requirements.map((item) => `${getTeamFunctionLabel(item.functionKey)}: ${item.quantity}`).join(', ');
}

export function formatScheduleMemberLabel(memberId: string, members: Member[], functionKey?: TeamFunctionKey) {
  const member = members.find((item) => item.id === memberId);
  const baseName = member?.nickname || member?.name || memberId;
  if (!functionKey) return baseName;
  return `${baseName} - ${getTeamFunctionLabel(functionKey)}`;
}

export function formatScheduleMembers(item: Pick<ScheduleItem, 'memberAssignments' | 'memberIds'>, members: Member[]) {
  const assignments: ScheduleAssignment[] = item.memberAssignments ?? item.memberIds.map((memberId) => ({ memberId }));
  return assignments.map((assignment) => formatScheduleMemberLabel(assignment.memberId, members, assignment.functionKey));
}

export function moduleUsesFunctionAssignments(moduleId: AppModuleId) {
  return Boolean(getModuleFunctionConfig(moduleId));
}

export function buildAssignmentsFromSelectedMembers(
  eventRule: Pick<EventRule, 'requiredMembers' | 'roleRequirements'>,
  selectedMemberIds: string[],
  members: Member[],
  currentAssignments: ScheduleAssignment[] = []
) {
  const slots = buildRoleSlots(eventRule);

  if (slots.length === 0) {
    return selectedMemberIds.slice(0, eventRule.requiredMembers).map((memberId) => ({ memberId }));
  }

  const remaining = [...selectedMemberIds];
  const assignments: ScheduleAssignment[] = [];

  slots.forEach((functionKey) => {
    const preserved = currentAssignments.find((assignment) => assignment.functionKey === functionKey && remaining.includes(assignment.memberId));
    const preservedIndex = preserved ? remaining.indexOf(preserved.memberId) : -1;

    if (preserved && preservedIndex >= 0) {
      assignments.push({ memberId: preserved.memberId, functionKey });
      remaining.splice(preservedIndex, 1);
      return;
    }

    const nextIndex = remaining.findIndex((memberId) => {
      const member = members.find((item) => item.id === memberId);
      return member ? memberHasFunction(member, functionKey) : false;
    });

    if (nextIndex >= 0) {
      assignments.push({ memberId: remaining[nextIndex], functionKey });
      remaining.splice(nextIndex, 1);
    }
  });

  return assignments;
}