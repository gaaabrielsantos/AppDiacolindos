import { Link, useLocation } from 'react-router-dom';
import './layout.css';
import logoIPB from '../assets/logo-ipb.svg';

const menuItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Integrantes', path: '/integrantes' },
  { label: 'Eventos', path: '/eventos' },
  { label: 'Escala', path: '/escala' },
  { label: 'Histórico', path: '/historico' },
  { label: 'Configurações', path: '/configuracoes' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {logoIPB ? (
            <img src={logoIPB} alt="Igreja Presbiteriana do Brasil" style={{ height: 44 }} />
          ) : (
            <div>
              <strong>Igreja Presbiteriana do Brasil</strong>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong>Diacolindos</strong>
            <span>Escalas automáticas</span>
          </div>
        </div>
        <nav>
          {menuItems.map((item) => (
            <Link key={item.path} to={item.path} className={location.pathname === item.path ? 'active' : ''}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <span>Gestão da escala de diáconos</span>
          </div>
          <div className="profile-badge">Admin</div>
        </header>
        <section className="content-inner">{children}</section>
      </main>
    </div>
  );
}
