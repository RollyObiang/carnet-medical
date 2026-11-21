import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { TYPES, TYPE_COLORS, formatDate } from '../docTypes.js';

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo, comme côté serveur

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

function UploadForm({ onUploaded, onCancel }) {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get('file');

    setError('');
    if (!file || !file.size) return setError('Choisissez un fichier.');
    if (file.size > MAX_SIZE) return setError('Ce fichier dépasse 10 Mo. Choisissez-en un plus léger.');
    // Une date vide serait refusée par le serveur : on ne l'envoie pas
    if (!data.get('document_date')) data.delete('document_date');

    setSubmitting(true);
    try {
      await api('/documents', { method: 'POST', body: data });
      form.reset();
      setFileName('');
      onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel upload-panel">
      <h2>Ajouter un document</h2>

      <label className="dropzone">
        <input
          type="file"
          name="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          required
          onChange={(e) => setFileName(e.target.files[0]?.name ?? '')}
        />
        <span className="dropzone-title">{fileName || 'Choisissez un fichier ou déposez-le ici'}</span>
        <span className="muted">PDF, JPG ou PNG, 10 Mo maximum</span>
      </label>

      <label>
        Titre
        <input name="title" maxLength={200} required placeholder="Exemple : bilan sanguin de novembre" />
      </label>

      <div className="row">
        <label>
          Type
          <select name="type" defaultValue="autre">
            {Object.entries(TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date du document
          <input type="date" name="document_date" />
        </label>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Envoi en cours...' : 'Enregistrer le document'}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [adding, setAdding] = useState(false);
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
    const params = new URLSearchParams({ limit: '100' });
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

  function showFlash(message) {
    setFlash(message);
    setTimeout(() => setFlash(''), 4000);
  }

  async function handleDelete(doc) {
    if (!window.confirm(`Supprimer « ${doc.title} » ?`)) return;
    try {
      await api(`/documents/${doc.id}`, { method: 'DELETE' });
      showFlash('Document supprimé.');
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  const filtering = Boolean(type || debouncedSearch);

  return (
    <>
      <header className="page-head page-head-row">
        <div>
          <h1>Documents</h1>
          <p>Ordonnances, résultats d’analyses, imagerie : tout au même endroit, toujours disponible.</p>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)}>
            Ajouter un document
          </button>
        )}
      </header>

      {flash && (
        <p className="flash" role="status">
          {flash}
        </p>
      )}

      {adding && (
        <UploadForm
          onCancel={() => setAdding(false)}
          onUploaded={() => {
            setAdding(false);
            showFlash('Document ajouté.');
            reload();
          }}
        />
      )}

      <div className="filters">
        <input
          type="search"
          aria-label="Rechercher par titre"
          placeholder="Rechercher par titre"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Filtrer par type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section className="panel" aria-label="Liste des documents">
        <div className="panel-head">
          <h2>
            {loading ? 'Chargement...' : `${documents.length} document${documents.length > 1 ? 's' : ''}`}
          </h2>
        </div>

        {!loading && documents.length === 0 ? (
          <div className="empty">
            {filtering ? (
              <>
                <p>Aucun document ne correspond à cette recherche.</p>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setSearch('');
                    setType('');
                  }}
                >
                  Effacer les filtres
                </button>
              </>
            ) : (
              <>
                <p>Votre coffre-fort est vide. Ajoutez une ordonnance, des résultats d’analyses ou votre carnet de vaccination.</p>
                <button type="button" onClick={() => setAdding(true)}>
                  Ajouter mon premier document
                </button>
              </>
            )}
          </div>
        ) : (
          <ul className="doc-rows">
            {documents.map((doc) => (
              <li key={doc.id} className="doc-row">
                <span className="tab-mark" style={{ '--tab': TYPE_COLORS[doc.type] }} aria-hidden="true" />
                <div>
                  <div className="doc-title">{doc.title}</div>
                  <div className="doc-meta">
                    <span>{TYPES[doc.type]}</span>
                    <span>{formatDate(doc.document_date)}</span>
                    <span>{formatSize(doc.size_bytes)}</span>
                  </div>
                </div>
                <div className="actions">
                  <a className="button-link" href={`/api/documents/${doc.id}/download`}>
                    Télécharger
                  </a>
                  <button type="button" className="danger" onClick={() => handleDelete(doc)}>
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}