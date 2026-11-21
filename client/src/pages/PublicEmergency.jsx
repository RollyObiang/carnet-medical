import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function PublicEmergency() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/public/emergency/${token}`)
      .then(({ emergency }) => setData(emergency))
      .catch(() => setError('Cette fiche n’existe pas ou n’est plus partagée.'));
  }, [token]);

  if (error) {
    return (
      <main className="public-page">
        <div className="id-card">
          <div className="id-card-band">Fiche d’urgence</div>
          <div className="id-card-body">
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        </div>
      </main>
    );
  }
  if (!data) return <main className="public-page"><p>Chargement...</p></main>;

  const phone = data.emergency_contact_phone?.replace(/[^\d+]/g, '');

  return (
    <main className="public-page">
      <article className="id-card">
        <div className="id-card-band">Fiche d’urgence</div>
        <div className="id-card-body">
          <h1 className="holder">
            {data.first_name} {data.last_name}
          </h1>

          <div className="vital">
            <span>Groupe sanguin</span>
            <span className="blood">{data.blood_group ?? 'Non renseigné'}</span>
          </div>

          <h2>Allergies</h2>
          {data.allergies.length ? (
            <div className="alert-box">
              <ul style={{ margin: 0 }}>
                {data.allergies.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="muted">Aucune allergie renseignée</p>
          )}

          <h2>Traitements en cours</h2>
          {data.current_medications.length ? (
            <ul>
              {data.current_medications.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">Aucun traitement renseigné</p>
          )}

          {data.vital_notes && (
            <>
              <h2>Notes importantes</h2>
              <p style={{ whiteSpace: 'pre-wrap' }}>{data.vital_notes}</p>
            </>
          )}

          <h2>Contact d’urgence</h2>
          {data.emergency_contact_name || phone ? (
            <>
              {data.emergency_contact_name && <p style={{ margin: '0 0 0.75rem' }}>{data.emergency_contact_name}</p>}
              {phone && (
                <a className="button-link primary call" href={`tel:${phone}`}>
                  Appeler {data.emergency_contact_phone}
                </a>
              )}
            </>
          ) : (
            <p className="muted">Aucun contact renseigné</p>
          )}

          <p className="muted public-note">Informations déclarées par le patient, non vérifiées par un professionnel de santé.</p>
        </div>
      </article>
    </main>
  );
}