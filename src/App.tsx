import { Route, Routes, Navigate, useLocation, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/Dashboard';
import { MembersPage } from './pages/Members';
import { EventsPage } from './pages/Events';
import { SchedulePage } from './pages/Schedule';
import { HistoryPage } from './pages/History';
import { AppProvider } from './hooks/useAppState';
import { AccessControlProvider, useAccessControl } from './hooks/useAccessControl';
import { AccessGate } from './components/AccessGate';
import { useEffect, useRef, useState } from 'react';
import { AppModuleId, buildModulePath, DEFAULT_MODULE_ID, isAppModuleId } from './config/modules';
import { ModuleProvider } from './hooks/useModule';
import { PrincipalDashboardPage } from './pages/PrincipalDashboard';

function ModuleRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="integrantes" element={<MembersPage />} />
      <Route path="eventos" element={<EventsPage />} />
      <Route path="escala" element={<SchedulePage />} />
      <Route path="historico" element={<HistoryPage />} />
      <Route path="" element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

function ModuleShell({ moduleId, onOpenLogin }: { moduleId: AppModuleId; onOpenLogin: () => void }) {
  return (
    <ModuleProvider moduleId={moduleId}>
      <AppProvider moduleId={moduleId}>
        <Layout onOpenLogin={onOpenLogin}>
          <ModuleRoutes />
        </Layout>
      </AppProvider>
    </ModuleProvider>
  );
}

function ModuleRouteResolver({ onOpenLogin }: { onOpenLogin: () => void }) {
  const { moduleId } = useParams();
  const location = useLocation();
  const { isAuthenticated, canAccessModule, getDefaultPath } = useAccessControl();

  if (!moduleId || !isAppModuleId(moduleId)) {
    return <Navigate to={buildModulePath(DEFAULT_MODULE_ID)} replace />;
  }

  if (isAuthenticated && !canAccessModule(moduleId)) {
    return <Navigate to={getDefaultPath()} replace state={{ from: location }} />;
  }

  return <ModuleShell moduleId={moduleId} onOpenLogin={onOpenLogin} />;
}

function PrincipalRouteResolver() {
  const location = useLocation();
  const { isInitializing, canAccessPrincipal, getDefaultPath } = useAccessControl();

  if (isInitializing) return null;

  if (!canAccessPrincipal()) {
    return <Navigate to={getDefaultPath()} replace state={{ from: location }} />;
  }

  return <PrincipalDashboardPage />;
}

function AppContent() {
  const { isAuthenticated, isInitializing, getDefaultPath } = useAccessControl();
  const [loginOpen, setLoginOpen] = useState(false);
  const hasInitializedGate = useRef(false);

  useEffect(() => {
    if (isInitializing) return;

    if (!hasInitializedGate.current) {
      setLoginOpen(!isAuthenticated);
      hasInitializedGate.current = true;
      return;
    }

    if (isAuthenticated) {
      setLoginOpen(false);
    }
  }, [isAuthenticated, isInitializing]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to={buildModulePath(DEFAULT_MODULE_ID)} replace />} />
        <Route path="/principal/dashboard" element={<PrincipalRouteResolver />} />
        <Route path="/:moduleId/*" element={<ModuleRouteResolver onOpenLogin={() => setLoginOpen(true)} />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? getDefaultPath() : buildModulePath(DEFAULT_MODULE_ID)} replace />} />
      </Routes>
      {!isInitializing ? <AccessGate loginOpen={loginOpen} onClose={() => setLoginOpen(false)} /> : null}
    </>
  );
}

export default function App() {
  return (
    <AccessControlProvider>
      <AppContent />
    </AccessControlProvider>
  );
}
