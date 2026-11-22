import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Documents from './pages/Documents.jsx';
import Profile from './pages/Profile.jsx';
import Emergency from './pages/Emergency.jsx';
import PublicEmergency from './pages/PublicEmergency.jsx';
import Directory from './pages/Directory.jsx';
import Facility from './pages/Facility.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</p>;
  return user ? children : <Navigate to="/connexion" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/urgence" element={<Emergency />} />
        <Route path="/annuaire" element={<Directory />} />
        <Route path="/annuaire/:id" element={<Facility />} />
      </Route>

      <Route path="/connexion" element={<Login />} />
      <Route path="/inscription" element={<Register />} />
      <Route path="/urgence/:token" element={<PublicEmergency />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}