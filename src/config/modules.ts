export const APP_MODULE_IDS = ['diaconia', 'recepcao', 'midias', 'louvor', 'cozinha', 'ebd'] as const;

export type AppModuleId = (typeof APP_MODULE_IDS)[number];

export const DEFAULT_MODULE_ID: AppModuleId = 'diaconia';

export const MODULE_LABELS: Record<AppModuleId, string> = {
  diaconia: 'Diaconia',
  recepcao: 'Recepção',
  midias: 'Mídias',
  louvor: 'Louvor',
  cozinha: 'Cozinha',
  ebd: 'EBD',
};

export const MODULE_ROUTE_SEGMENTS = ['dashboard', 'integrantes', 'eventos', 'escala', 'historico'] as const;

export type ModuleRouteSegment = (typeof MODULE_ROUTE_SEGMENTS)[number];

export function isAppModuleId(value: string): value is AppModuleId {
  return APP_MODULE_IDS.includes(value as AppModuleId);
}

export function buildModulePath(moduleId: AppModuleId, segment: ModuleRouteSegment = 'dashboard') {
  return `/${moduleId}/${segment}`;
}