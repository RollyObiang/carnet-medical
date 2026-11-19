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
      .catch(() => setError('Fiche introuvable ou désactivée'));
  }, [token]);

  if (error) {
    return <main className="card"><p className="error">{error}</p></main>;
  }
  if (!data) return <main className="card"><p>Chargement...</p></main>;

  return (
    <main className="card">
      <p className="muted">Fiche d'urgence</p>
      <h1>{data.first_name} {data.last_name}</h1>

      <p className="muted" style={{ marginBottom: 0 }}>Groupe sanguin</p>
      <p className="blood">{data.blood_group ?? 'Non renseigné'}</p>

      <h2>Allergies</h2>
      {data.allergies.length ? (
        <div className="alert-box">
          <ul style={{ margin: 0 }}>{data.allergies.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      ) : (
        <p className="muted">Aucune allergie renseignée</p>
      )}

      <h2>Traitements en cours</h2>
      {data.current_medications.length ? (
        <ul>{data.current_medications.map((m, i) => <li key={i}>{m}</li>)}</ul>
      ) : (
        <p className="muted">Aucun traitement renseigné</p>
      )}

      {data.vital_notes && (
        <>
          <h2>Notes importantes</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{data.vital_notes}</p>
        </>
      )}

      <h2>Contact d'urgence</h2>
      {data.emergency_contact_name || data.emergency_contact_phone ? (
        <p>
          {data.emergency_contact_name}{' '}
          {data.emergency_contact_phone && (
            <a href={`tel:${data.emergency_contact_phone.replace(/[^\d+]/g, '')}`}>
              {data.emergency_contact_phone}
            </a>
          )}
        </p>
      ) : (
        <p className="muted">Aucun contact renseigné</p>
      )}
    </main>
  );
}