import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { FACILITY_TYPES, FACILITY_PLURALS, FACILITY_COLORS, telHref } from '../facilityTypes.js';

export default function Directory() {
  const [specialties, setSpecialties] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [type, setType] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    api('/directory/specialties')
      .then(({ specialties }) => setSpecialties(specialties))
      .catch(() => {});
  }, []);

  // On attend 300 ms après la dernière frappe avant de chercher
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ limit: '50' });
    if (type) params.set('type', type);
    if (specialty) params.set('specialty', specialty);
    if (debouncedSearch) params.set('q', debouncedSearch);

    setLoading(true);
    api(`/directory/establishments?${params}`)
      .then(({ establishments }) => {
        if (cancelled) return;
        setResults(establishments);
        setError('');
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [type, specialty, debouncedSearch]);

  const filtering = Boolean(type || specialty || debouncedSearch);

  function clearFilters() {
    setSearch('');
    setType('');
    setSpecialty('');
  }

  return (
    <>
      <header className="page-head">
        <h1>Annuaire</h1>
        <p>Trouvez l’hôpital, le médecin, la pharmacie ou le laboratoire qu’il vous faut.</p>
      </header>

      <div className="notice danger">
        <p>
          <strong>Urgence vitale ?</strong> Appelez immédiatement les secours. Cet annuaire ne remplace pas un appel d’urgence.
        </p>
      </div>

      <div className="chips" role="group" aria-label="Type de structure">
        <button type="button" className="chip" aria-pressed={type === ''} onClick={() => setType('')}>
          Tout
        </button>
        {Object.entries(FACILITY_PLURALS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="chip"
            aria-pressed={type === value}
            onClick={() => setType(type === value ? '' : value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filters">
        <input
          type="search"
          aria-label="Rechercher par nom ou par ville"
          placeholder="Rechercher par nom ou par ville"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Filtrer par spécialité" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
          <option value="">Toutes les spécialités</option>
          {specialties.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section className="panel" aria-label="Résultats">
        <div className="panel-head">
          <h2>{loading ? 'Recherche...' : `${results.length} résultat${results.length > 1 ? 's' : ''}`}</h2>
        </div>

        {!loading && results.length === 0 ? (
          <div className="empty">
            <p>Aucune structure ne correspond. Essayez un autre mot, ou retirez un filtre.</p>
            {filtering && (
              <button type="button" className="ghost" onClick={clearFilters}>
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <ul className="doc-rows">
            {results.map((place) => (
              <li key={place.id} className="place-row">
                <span className="tab-mark" style={{ '--tab': FACILITY_COLORS[place.type] }} aria-hidden="true" />
                <div>
                  <div className="place-name">{place.name}</div>
                  <div className="doc-meta">
                    <span>{FACILITY_TYPES[place.type]}</span>
                    <span>{place.city}</span>
                  </div>
                  <div className="place-lines">
                    {place.address && <span>{place.address}</span>}
                    {place.opening_hours && <span>{place.opening_hours}</span>}
                    {place.phone && (
                      <span>
                        <a href={telHref(place.phone)}>{place.phone}</a>
                      </span>
                    )}
                    {place.specialties.length > 0 && <span>{place.specialties.join(', ')}</span>}
                  </div>
                </div>
                <Link className="button-link" to={`/annuaire/${place.id}`}>
                  Voir la fiche
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}