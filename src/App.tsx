import { Route, Routes, Navigate } from 'react-router-dom';
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

function AppContent() {
  const { isAdmin } = useAccessControl();
  const [loginOpen, setLoginOpen] = useState(() => !isAdmin);

  useEffect(() => {
    if (isAdmin) {
      setLoginOpen(false);
    }
  }, [isAdmin]);

  return (
    <AppProvider>
      <Layout onOpenLogin={() => setLoginOpen(true)}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/integrantes" element={<MembersPage />} />
          <Route path="/eventos" element={<EventsPage />} />
          <Route path="/escala" element={<SchedulePage />} />
          <Route path="/historico" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <AccessGate loginOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </AppProvider>
  );
}

export default function App() {
  return (
    <AccessControlProvider>
      <AppContent />
    </AccessControlProvider>
  );
}
