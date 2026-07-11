import { createContext, useContext } from 'react';
import { AppModuleId, DEFAULT_MODULE_ID, MODULE_LABELS } from '../config/modules';

interface ModuleContextValue {
  moduleId: AppModuleId;
  moduleLabel: string;
}

const ModuleContext = createContext<ModuleContextValue>({
  moduleId: DEFAULT_MODULE_ID,
  moduleLabel: MODULE_LABELS[DEFAULT_MODULE_ID],
});

export function ModuleProvider({ children, moduleId }: { children: React.ReactNode; moduleId: AppModuleId }) {
  return (
    <ModuleContext.Provider
      value={{
        moduleId,
        moduleLabel: MODULE_LABELS[moduleId],
      }}
    >
      {children}
    </ModuleContext.Provider>
  );
}

export function useModule() {
  return useContext(ModuleContext);
}