import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordField from '../components/PasswordField.jsx';

function messageFrom(err) {
  if (err.details?.password) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (err.details?.email) return 'Cette adresse e-mail n’est pas valide.';
  if (err.status === 409) return 'Un compte existe déjà avec cette adresse e-mail. Essayez de vous connecter.';
  return err.message;
}

export default function Register() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
    } catch (err) {
      setError(messageFrom(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Créez votre carnet en moins d’une minute."
      footer={
        <>
          Déjà un compte ? <Link to="/connexion">Se connecter</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="row">
          <label>
            Prénom
            <input autoComplete="given-name" value={form.first_name} onChange={update('first_name')} required />
          </label>
          <label>
            Nom
            <input autoComplete="family-name" value={form.last_name} onChange={update('last_name')} required />
          </label>
        </div>
        <label>
          Adresse e-mail
          <input type="email" autoComplete="email" value={form.email} onChange={update('email')} required />
        </label>
        <PasswordField
          label="Mot de passe"
          hint="8 caractères minimum."
          autoComplete="new-password"
          minLength={8}
          value={form.password}
          onChange={update('password')}
          required
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Création du compte...' : 'Créer mon compte'}
        </button>
      </form>
    </AuthLayout>
  );
}