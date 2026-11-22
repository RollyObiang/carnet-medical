import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const LINKS = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/documents', label: 'Documents' },
  { to: '/annuaire', label: 'Annuaire' },
  { to: '/urgence', label: 'Fiche d’urgence' },
  { to: '/profil', label: 'Profil' },
  { to: '/rendez-vous', label: 'Rendez-vous' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          Carnet
          <br />
          médicale
        </div>

        <nav className="nav" aria-label="Navigation principale">
          {LINKS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="account">
          <strong>
            {user.first_name} {user.last_name}
          </strong>
          <div className="email">{user.email}</div>
          <button className="quiet" onClick={logout}>
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="content">
        <Outlet />
      </div>
    </div>
  );
}