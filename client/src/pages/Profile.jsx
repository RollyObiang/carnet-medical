import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

const EMPTY = {
  first_name: '',
  last_name: '',
  birth_date: '',
  sex: '',
  blood_group: '',
  phone: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
};
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const SEX_LABELS = { F: 'Femme', M: 'Homme', autre: 'Autre' };

export default function Profile() {
  const { refresh } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/patients/me')
      .then(({ patient }) => {
        setEmail(patient.email);
        // Les champs vides arrivent à null : on les convertit en texte vide pour les formulaires
        setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, patient[k] ?? ''])));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setSaved(false);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);

    // Le serveur refuse une valeur vide pour la date, le sexe et le groupe sanguin
    const body = {};
    for (const [key, value] of Object.entries(form)) {
      if (['birth_date', 'sex', 'blood_group'].includes(key) && value === '') continue;
      body[key] = value;
    }

    try {
      await api('/patients/me', { method: 'PATCH', body });
      await refresh();
      setSaved(true);
    } catch (err) {
      const fields = err.details ? ` (${Object.keys(err.details).join(', ')})` : '';
      setError(err.message + fields);
    } finally {
      setSaving(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <header className="page-head">
        <h1>Profil</h1>
        <p>Ces informations alimentent votre fiche d’urgence et simplifient vos échanges avec les soignants.</p>
      </header>

      {loading && <p>Chargement...</p>}

      {!loading && (
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <section className="form-section">
            <h2>Identité</h2>
            <div className="row">
              <label>
                Prénom
                <input value={form.first_name} onChange={update('first_name')} required />
              </label>
              <label>
                Nom
                <input value={form.last_name} onChange={update('last_name')} required />
              </label>
            </div>
            <div className="row">
              <label>
                Date de naissance
                <input type="date" max={today} value={form.birth_date} onChange={update('birth_date')} />
              </label>
              <label>
                Sexe
                <select value={form.sex} onChange={update('sex')}>
                  <option value="">Non renseigné</option>
                  {Object.entries(SEX_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="form-section">
            <h2>Santé</h2>
            <label>
              Groupe sanguin
              <span className="hint">Il apparaît sur votre fiche d’urgence.</span>
              <select value={form.blood_group} onChange={update('blood_group')}>
                <option value="">Non renseigné</option>
                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="form-section">
            <h2>Coordonnées</h2>
            <div className="row">
              <label>
                Téléphone
                <input type="tel" maxLength={30} value={form.phone} onChange={update('phone')} />
              </label>
              <label>
                E-mail du compte
                <input value={email} readOnly />
              </label>
            </div>
          </section>

          <section className="form-section">
            <h2>Contact d’urgence</h2>
            <p>La personne à prévenir en cas de problème.</p>
            <div className="row">
              <label>
                Nom
                <input maxLength={100} value={form.emergency_contact_name} onChange={update('emergency_contact_name')} />
              </label>
              <label>
                Téléphone
                <input type="tel" maxLength={30} value={form.emergency_contact_phone} onChange={update('emergency_contact_phone')} />
              </label>
            </div>
          </section>

          <div className="form-footer">
            <button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
            {saved && (
              <p className="flash" role="status">
                Profil enregistré.
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        </form>
      )}
    </>
  );
}