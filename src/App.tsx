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
import { useEffect, useState } from 'react';
import { AppModuleId, isAppModuleId } from './config/modules';
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
    return <Navigate to={getDefaultPath()} replace />;
  }

  if (isAuthenticated && !canAccessModule(moduleId)) {
    return <Navigate to={getDefaultPath()} replace state={{ from: location }} />;
  }

  return <ModuleShell moduleId={moduleId} onOpenLogin={onOpenLogin} />;
}

function PrincipalRouteResolver({ onOpenLogin }: { onOpenLogin: () => void }) {
  const location = useLocation();
  const { isInitializing, canAccessPrincipal, getDefaultPath } = useAccessControl();

  if (isInitializing) return null;

  if (!canAccessPrincipal()) {
    return <Navigate to={getDefaultPath()} replace state={{ from: location }} />;
  }

  return <PrincipalDashboardPage onOpenLogin={onOpenLogin} />;
}

function AppContent() {
  const { isAuthenticated, isInitializing, getDefaultPath } = useAccessControl();
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLoginOpen(false);
    }
  }, [isAuthenticated]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/principal/dashboard" replace />} />
        <Route path="/principal/dashboard" element={<PrincipalRouteResolver onOpenLogin={() => setLoginOpen(true)} />} />
        <Route path="/:moduleId/*" element={<ModuleRouteResolver onOpenLogin={() => setLoginOpen(true)} />} />
        <Route path="*" element={<Navigate to={getDefaultPath()} replace />} />
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
