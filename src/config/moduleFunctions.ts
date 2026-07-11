import { AppModuleId } from './modules';

export const TEAM_FUNCTION_KEYS = [
  'stories',
  'fotos',
  'vocal',
  'violao',
  'guitarra',
  'baixo',
  'bateria',
  'teclado_synths',
  'mesa_som',
] as const;

export type TeamFunctionKey = (typeof TEAM_FUNCTION_KEYS)[number];

export interface TeamFunctionOption {
  key: TeamFunctionKey;
  label: string;
}

export interface ModuleFunctionConfig {
  memberFieldLabel: string;
  options: TeamFunctionOption[];
  eventRequirementsMode: 'optional' | 'required';
}

const SHARED_OPTIONS: Record<TeamFunctionKey, TeamFunctionOption> = {
  stories: { key: 'stories', label: 'Stories' },
  fotos: { key: 'fotos', label: 'Fotos' },
  vocal: { key: 'vocal', label: 'Vocal' },
  violao: { key: 'violao', label: 'Violão' },
  guitarra: { key: 'guitarra', label: 'Guitarra' },
  baixo: { key: 'baixo', label: 'Baixo' },
  bateria: { key: 'bateria', label: 'Bateria' },
  teclado_synths: { key: 'teclado_synths', label: 'Teclado/Synths' },
  mesa_som: { key: 'mesa_som', label: 'Mesa de som' },
};

export const MODULE_FUNCTION_CONFIG: Partial<Record<AppModuleId, ModuleFunctionConfig>> = {
  midias: {
    memberFieldLabel: 'Função na equipe',
    options: [SHARED_OPTIONS.stories, SHARED_OPTIONS.fotos],
    eventRequirementsMode: 'optional',
  },
  louvor: {
    memberFieldLabel: 'Instrumentos/Funções',
    options: [
      SHARED_OPTIONS.vocal,
      SHARED_OPTIONS.violao,
      SHARED_OPTIONS.guitarra,
      SHARED_OPTIONS.baixo,
      SHARED_OPTIONS.bateria,
      SHARED_OPTIONS.teclado_synths,
      SHARED_OPTIONS.mesa_som,
    ],
    eventRequirementsMode: 'required',
  },
};

export function getModuleFunctionConfig(moduleId: AppModuleId) {
  return MODULE_FUNCTION_CONFIG[moduleId] ?? null;
}

export function getTeamFunctionLabel(functionKey: TeamFunctionKey) {
  return SHARED_OPTIONS[functionKey]?.label ?? functionKey;
}