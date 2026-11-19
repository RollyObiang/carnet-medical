import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api.js';

const toLines = (arr) => (arr ?? []).join('\n');
const fromLines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean);

export default function Emergency() {
  const [form, setForm] = useState({ allergies: '', medications: '', notes: '', is_public: false });
  const [token, setToken] = useState(null);
  const [active, setActive] = useState(false); // état enregistré côté serveur
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  function applyServerState(e) {
    setToken(e.public_token);
    setActive(e.is_public);
  }

  useEffect(() => {
    api('/emergency/me')
      .then(({ emergency: e }) => {
        setForm({
          allergies: toLines(e.allergies),
          medications: toLines(e.current_medications),
          notes: e.vital_notes ?? '',
          is_public: e.is_public,
        });
        applyServerState(e);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: value });
    setSaved(false);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { emergency } = await api('/emergency/me', {
        method: 'PUT',
        body: {
          allergies: fromLines(form.allergies),
          current_medications: fromLines(form.medications),
          vital_notes: form.notes,
          is_public: form.is_public,
        },
      });
      applyServerState(emergency);
      setSaved(true);
    } catch (err) {
      const fields = err.details ? ` (${Object.keys(err.details).join(', ')})` : '';
      setError(err.message + fields);
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    if (!window.confirm("L'ancien lien et l'ancien QR code ne fonctionneront plus. Continuer ?")) return;
    try {
      const { emergency } = await api('/emergency/me/regenerate-link', { method: 'POST' });
      applyServerState(emergency);
    } catch (err) {
      setError(err.message);
    }
  }

  const link = active && token ? `${window.location.origin}/urgence/${token}` : null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copie impossible : sélectionnez le lien manuellement');
    }
  }

  return (
    <main className="card">
      <p><Link to="/">← Retour</Link></p>
      <h1>Ma fiche d'urgence</h1>
      <p className="muted">
        Les informations vitales qu'un secouriste ou un médecin doit connaître en cas d'urgence.
      </p>
      {loading && <p>Chargement...</p>}

      {!loading && (
        <form onSubmit={handleSubmit}>
          <label>
            Allergies (une par ligne)
            <textarea rows={4} value={form.allergies} onChange={update('allergies')} placeholder={'Pénicilline\nArachides'} />
          </label>
          <label>
            Traitements en cours (un par ligne)
            <textarea rows={4} value={form.medications} onChange={update('medications')} placeholder="Metformine 500 mg, 2 fois par jour" />
          </label>
          <label>
            Notes vitales
            <textarea rows={3} maxLength={1000} value={form.notes} onChange={update('notes')} placeholder="Diabétique, porte un pacemaker..." />
          </label>

          <label className="checkbox">
            <input type="checkbox" checked={form.is_public} onChange={update('is_public')} />
            <span>
              Rendre ma fiche accessible par QR code. <strong>Toute personne qui a le lien ou le QR code</strong> pourra voir
              ces informations, mon nom, mon groupe sanguin et mon contact d'urgence, sans se connecter.
            </span>
          </label>

          {error && <p className="error">{error}</p>}
          {saved && <p style={{ color: '#2b8a3e', margin: 0 }}>Fiche enregistrée.</p>}
          <button type="submit" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      )}

      {link && (
        <div className="qr-box">
          <QRCodeSVG value={link} size={180} />
          <input readOnly value={link} onFocus={(e) => e.target.select()} style={{ width: '100%' }} />
          <div className="row">
            <button type="button" onClick={copyLink}>{copied ? 'Copié !' : 'Copier le lien'}</button>
            <button type="button" className="danger" onClick={regenerate}>Générer un nouveau lien</button>
          </div>
        </div>
      )}
    </main>
  );
}