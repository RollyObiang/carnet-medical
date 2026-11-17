import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="card">
      <h1>Créer un compte</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Prénom
          <input value={form.first_name} onChange={update('first_name')} required />
        </label>
        <label>
          Nom
          <input value={form.last_name} onChange={update('last_name')} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={update('email')} required />
        </label>
        <label>
          Mot de passe (8 caractères minimum)
          <input type="password" minLength={8} value={form.password} onChange={update('password')} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Création...' : "S'inscrire"}
        </button>
      </form>
      <p>
        Déjà un compte ? <Link to="/connexion">Se connecter</Link>
      </p>
    </main>
  );
}