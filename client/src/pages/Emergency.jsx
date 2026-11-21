import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api.js';

const toLines = (arr) => (arr ?? []).join('\n');
const fromLines = (text) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

export default function Emergency() {
  const [form, setForm] = useState({ allergies: '', medications: '', notes: '', is_public: false });
  const [patient, setPatient] = useState(null);
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
    Promise.all([api('/emergency/me'), api('/patients/me')])
      .then(([{ emergency: e }, { patient }]) => {
        setPatient(patient);
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
    if (!window.confirm('L’ancien lien et l’ancien QR code ne fonctionneront plus. Continuer ?')) return;
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
      setError('Copie impossible : sélectionnez le lien à la main.');
    }
  }

  if (loading) return <p>Chargement...</p>;
  if (!patient) return <p className="error">{error || 'Profil introuvable.'}</p>;

  // L'aperçu reflète ce que l'utilisateur est en train de saisir
  const allergies = fromLines(form.allergies);
  const medications = fromLines(form.medications);
  const unsaved = form.is_public !== active;

  return (
    <>
      <header className="page-head">
        <h1>Fiche d’urgence</h1>
        <p>Les informations qu’un secouriste ou un médecin doit connaître en quelques secondes.</p>
      </header>

      <div className="emergency-layout">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <section className="form-section">
            <h2>Informations vitales</h2>
            <label>
              Allergies
              <span className="hint">Une par ligne.</span>
              <textarea rows={4} value={form.allergies} onChange={update('allergies')} placeholder={'Pénicilline\nArachides'} />
            </label>
            <label>
              Traitements en cours
              <span className="hint">Un par ligne, avec la dose si possible.</span>
              <textarea rows={4} value={form.medications} onChange={update('medications')} placeholder="Metformine 500 mg, 2 fois par jour" />
            </label>
            <label>
              Notes importantes
              <span className="hint">Maladie chronique, appareil implanté, handicap...</span>
              <textarea rows={3} maxLength={1000} value={form.notes} onChange={update('notes')} />
            </label>
          </section>

          <section className="form-section">
            <h2>Partage par QR code</h2>
            <label className="switch">
              <input type="checkbox" role="switch" checked={form.is_public} onChange={update('is_public')} />
              <span>
                Rendre ma fiche accessible sans connexion
                <small className="hint">
                  Toute personne qui a le lien ou le QR code verra ces informations, votre nom, votre groupe sanguin et votre
                  contact d’urgence. Vous pouvez désactiver le partage à tout moment.
                </small>
              </span>
            </label>
          </section>

          <div className="form-footer">
            <button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer la fiche'}
            </button>
            {saved && (
              <p className="flash" role="status">
                Fiche enregistrée.
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        </form>

        <div className="emergency-side">
          <p className="muted">Aperçu : ce que verront les secours</p>

          <aside className="id-card" aria-label="Aperçu de la fiche d’urgence">
            <div className="id-card-band">Fiche d’urgence</div>
            <div className="id-card-body">
              <p className="holder">
                {patient.first_name} {patient.last_name}
              </p>
              <dl>
                <dt>Groupe sanguin</dt>
                <dd>{patient.blood_group ? <span className="blood">{patient.blood_group}</span> : 'Non renseigné'}</dd>
                <dt>Allergies</dt>
                <dd>{allergies.length ? allergies.join(', ') : 'Aucune renseignée'}</dd>
                <dt>Traitements</dt>
                <dd>{medications.length ? medications.join(', ') : 'Aucun renseigné'}</dd>
                <dt>Notes</dt>
                <dd style={{ whiteSpace: 'pre-wrap' }}>{form.notes.trim() || 'Aucune'}</dd>
                <dt>Contact</dt>
                <dd>
                  {patient.emergency_contact_name || patient.emergency_contact_phone
                    ? `${patient.emergency_contact_name ?? ''} ${patient.emergency_contact_phone ?? ''}`.trim()
                    : 'Non renseigné'}
                </dd>
              </dl>
              <p className={`status${active ? ' on' : ''}`}>
                {unsaved ? 'Modification non enregistrée' : active ? 'Accessible par QR code' : 'Non partagée'}
              </p>
            </div>
          </aside>

          <p className="muted">
            Le nom, le groupe sanguin et le contact viennent de votre <Link to="/profil">profil</Link>.
          </p>

          {link && (
            <div className="panel qr-panel">
              <QRCodeSVG value={link} size={168} />
              <input readOnly aria-label="Lien de la fiche" value={link} onFocus={(e) => e.target.select()} />
              <div className="form-actions">
                <button type="button" onClick={copyLink}>
                  {copied ? 'Lien copié' : 'Copier le lien'}
                </button>
                <button type="button" className="danger" onClick={regenerate}>
                  Nouveau lien
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}