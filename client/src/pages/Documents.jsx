import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const TYPES = {
  analyse: 'Analyse',
  ordonnance: 'Ordonnance',
  imagerie: 'Imagerie',
  compte_rendu: 'Compte rendu',
  vaccination: 'Vaccination',
  autre: 'Autre',
};
const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo, comme côté serveur

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// La date arrive en "AAAA-MM-JJ" : on l'inverse à la main pour éviter tout décalage de fuseau
function formatDate(d) {
  return d ? d.split('-').reverse().join('/') : 'Date non renseignée';
}

function UploadForm({ onUploaded }) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get('file');

    setError('');
    if (!file || !file.size) return setError('Choisissez un fichier');
    if (file.size > MAX_SIZE) return setError('Fichier trop volumineux (10 Mo maximum)');
    // Une date vide serait refusée par le serveur : on ne l'envoie pas
    if (!data.get('document_date')) data.delete('document_date');

    setSubmitting(true);
    try {
      await api('/documents', { method: 'POST', body: data });
      form.reset();
      onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="upload-form">
      <h2>Ajouter un document</h2>
      <label>
        Fichier (PDF, JPG ou PNG, 10 Mo maximum)
        <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required />
      </label>
      <label>
        Titre
        <input name="title" maxLength={200} required />
      </label>
      <div className="row">
        <label>
          Type
          <select name="type" defaultValue="autre">
            {Object.entries(TYPES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Date du document
          <input type="date" name="document_date" />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Envoi...' : 'Envoyer'}
      </button>
    </form>
  );
}

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // On attend 300 ms après la dernière frappe avant de chercher
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (debouncedSearch) params.set('q', debouncedSearch);

    setLoading(true);
    api(`/documents?${params}`)
      .then(({ documents }) => {
        if (cancelled) return;
        setDocuments(documents);
        setError('');
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [type, debouncedSearch, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  async function handleDelete(doc) {
    if (!window.confirm(`Supprimer « ${doc.title} » ?`)) return;
    try {
      await api(`/documents/${doc.id}`, { method: 'DELETE' });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="card wide">
      <p><Link to="/">← Retour</Link></p>
      <h1>Mes documents</h1>

      <UploadForm onUploaded={reload} />

      <h2>Mon coffre-fort</h2>
      <div className="row filters">
        <input
          type="search"
          placeholder="Rechercher par titre"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(TYPES).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Chargement...</p>}
      {!loading && !error && documents.length === 0 && (
        <p className="muted">Aucun document pour le moment.</p>
      )}

      <ul className="doc-list">
        {documents.map((doc) => (
          <li key={doc.id}>
            <div>
              <strong>{doc.title}</strong>
              <div className="muted">
                {TYPES[doc.type]} · {formatDate(doc.document_date)} · {formatSize(doc.size_bytes)}
              </div>
            </div>
            <div className="actions">
              <a className="button-link" href={`/api/documents/${doc.id}/download`}>Télécharger</a>
              <button className="danger" onClick={() => handleDelete(doc)}>Supprimer</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}