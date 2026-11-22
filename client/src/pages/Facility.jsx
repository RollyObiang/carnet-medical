import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { FACILITY_TYPES, telHref } from '../facilityTypes.js';

export default function Facility() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/directory/establishments/${id}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <>
        <p>
          <Link to="/annuaire">Retour à l’annuaire</Link>
        </p>
        <p className="error">{error}</p>
      </>
    );
  }
  if (!data) return <p>Chargement...</p>;

  const { establishment: e, practitioners } = data;

  return (
    <>
      <p>
        <Link to="/annuaire">Retour à l’annuaire</Link>
      </p>

      <header className="page-head">
        <h1>{e.name}</h1>
        <p>
          {FACILITY_TYPES[e.type]}, {e.city}
        </p>
      </header>

      <section className="panel" style={{ marginBottom: '2rem' }}>
        <dl className="info-list">
          <dt>Adresse</dt>
          <dd>{e.address ?? 'Non renseignée'}</dd>
          <dt>Téléphone</dt>
          <dd>{e.phone ? <a href={telHref(e.phone)}>{e.phone}</a> : 'Non renseigné'}</dd>
          <dt>Horaires</dt>
          <dd>{e.opening_hours ?? 'Non renseignés'}</dd>
        </dl>
      </section>

      <section className="panel" aria-labelledby="practitioners-title">
        <div className="panel-head">
          <h2 id="practitioners-title">Médecins</h2>
        </div>

        {practitioners.length === 0 ? (
          <div className="empty">
            <p>Aucun médecin n’est renseigné pour cette structure.</p>
          </div>
        ) : (
          <ul className="doc-rows">
            {practitioners.map((p) => (
              <li key={p.id} className="person-row">
                <div>
                  <div className="doc-title">
                    Dr {p.first_name} {p.last_name}
                  </div>
                  <div className="doc-meta">
                    <span>{p.specialty}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}