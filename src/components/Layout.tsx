import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './layout.css';

const menuItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Integrantes', path: '/integrantes' },
  { label: 'Eventos', path: '/eventos' },
  { label: 'Escala', path: '/escala' },
  { label: 'Histórico', path: '/historico' },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
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

    clearTimers();
    setSidebarOpen((current) => !current);
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
        <nav>
          {menuItems.map((item) => (
            <Link key={item.path} to={item.path} className={location.pathname === item.path ? 'active' : ''}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      {isMobile && sidebarOpen ? <button className="sidebar-overlay" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} /> : null}
      <main className="content">
        <header className="content-header">
          <button
            className="small-button button secondary theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Ativar modo noturno' : 'Ativar modo claro'}
            aria-label={theme === 'light' ? 'Ativar modo noturno' : 'Ativar modo claro'}
          >
            <span className={`theme-switch ${theme === 'dark' ? 'dark' : ''}`} aria-hidden>
              <span className="theme-switch-thumb">{theme === 'light' ? '🌙' : '☀️'}</span>
            </span>
          </button>
        </header>
        <section key={location.pathname} className="content-inner page-transition">{children}</section>
      </main>
    </div>
  );
}
