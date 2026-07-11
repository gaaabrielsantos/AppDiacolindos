import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './layout.css';
import { buildModulePath, type ModuleRouteSegment } from '../config/modules';
import { useAccessControl } from '../hooks/useAccessControl';
import { useModule } from '../hooks/useModule';

const menuItems: Array<{ label: string; path: ModuleRouteSegment }> = [
  { label: 'Dashboard', path: 'dashboard' },
  { label: 'Integrantes', path: 'integrantes' },
  { label: 'Eventos', path: 'eventos' },
  { label: 'Escala', path: 'escala' },
  { label: 'Histórico', path: 'historico' },
];

export function Layout({ children, onOpenLogin }: { children: ReactNode; onOpenLogin: () => void }) {
  const location = useLocation();
  const { accessMode, isAdmin, logout } = useAccessControl();
  const { moduleId } = useModule();
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 1024px)').matches);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('diacolindos-theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('diacolindos-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile, location.pathname]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)');
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
      setSidebarOpen(false);
    };

    setIsMobile(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const toggleSidebar = () => {
    clearTimers();
    setSidebarOpen((current) => !current);
  };

  const clearTimers = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleSidebarEnter = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (isMobile || sidebarOpen) return;
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    openTimerRef.current = window.setTimeout(() => {
      setSidebarOpen(true);
      openTimerRef.current = null;
    }, 1500);
  };

  const handleSidebarLeave = () => {
    if (isMobile) return;
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (!sidebarOpen) return;
    closeTimerRef.current = window.setTimeout(() => {
      setSidebarOpen(false);
      closeTimerRef.current = null;
    }, 700);
  };

  const handleSidebarClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('a')) return;

    toggleSidebar();
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  return (
    <div className={`app-shell ${!sidebarOpen && !isMobile ? 'sidebar-collapsed' : ''}`}>
      <aside
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        onClick={handleSidebarClick}
      >
        <div className="brand">
          {sidebarOpen ? <strong>Diacolindos</strong> : null}
        </div>
        {sidebarOpen ? (
          <div className="sidebar-access-group">
            <span className="sidebar-access-item" aria-live="polite">
              {accessMode === 'admin' ? 'Modo administrador' : 'Modo visualização'}
            </span>
            {isAdmin ? (
              <button type="button" className="sidebar-access-item" onClick={logout}>
                Sair
              </button>
            ) : (
              <button type="button" className="sidebar-access-item" onClick={onOpenLogin}>
                Entrar como administrador
              </button>
            )}
          </div>
        ) : null}
        <nav>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={buildModulePath(moduleId, item.path)}
              className={location.pathname === buildModulePath(moduleId, item.path) ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {sidebarOpen ? (
          <div className="sidebar-footer">
            <button
              className="small-button button secondary sidebar-theme-toggle"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Ativar modo noturno' : 'Ativar modo claro'}
              aria-label={theme === 'light' ? 'Ativar modo noturno' : 'Ativar modo claro'}
            >
              <span className={`theme-switch ${theme === 'dark' ? 'dark' : ''}`} aria-hidden>
                <span className="theme-switch-thumb">{theme === 'light' ? '🌙' : '☀️'}</span>
              </span>
              <span className="sidebar-theme-label">{theme === 'light' ? 'Ativar modo noturno' : 'Ativar modo claro'}</span>
            </button>
          </div>
        ) : null}
      </aside>
      {isMobile && sidebarOpen ? <button className="sidebar-overlay" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} /> : null}
      <main className="content">
        <header className="content-header">
          {isMobile ? (
            <button
              className="small-button button secondary mobile-menu-toggle"
              onClick={toggleSidebar}
              title={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>
          ) : null}
        </header>
        <section key={location.pathname} className="content-inner main-content page-transition">{children}</section>
      </main>
    </div>
  );
}
