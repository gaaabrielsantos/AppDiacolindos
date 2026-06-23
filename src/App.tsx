import { Route, Routes, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/Dashboard';
import { MembersPage } from './pages/Members';
import { EventsPage } from './pages/Events';
import { SchedulePage } from './pages/Schedule';
import { HistoryPage } from './pages/History';
import { SettingsPage } from './pages/Settings';
import { AppProvider } from './hooks/useAppState';

export default function App() {
  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/integrantes" element={<MembersPage />} />
          <Route path="/eventos" element={<EventsPage />} />
          <Route path="/escala" element={<SchedulePage />} />
          <Route path="/historico" element={<HistoryPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AppProvider>
  );
}
