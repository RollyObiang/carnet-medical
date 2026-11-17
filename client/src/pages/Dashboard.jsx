import { useAuth } from '../AuthContext.jsx';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <main className="card">
      <h1>Bonjour {user.first_name}</h1>
      <p>Connecté avec {user.email}</p>
      <p><Link to="/documents">Accéder à mes documents →</Link></p>  
      <button onClick={logout}>Se déconnecter</button>
    </main>
  );
}