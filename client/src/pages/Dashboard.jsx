import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { TYPES, TYPE_COLORS, formatDate } from '../docTypes.js';
import HealthBanner from '../components/HealthBanner.jsx';
import { dayNumber, longDate, monthShort, relativeDay, timeLabel } from '../dates.js';

function missingFields(p) {
  const missing = [];
  if (!p.birth_date) missing.push('date de naissance');
  if (!p.blood_group) missing.push('groupe sanguin');
  if (!p.phone) missing.push('téléphone');
  if (!p.emergency_contact_name || !p.emergency_contact_phone) missing.push('contact d’urgence');
  return missing;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

 useEffect(() => {
  Promise.all([
    api('/patients/me'),
    api('/emergency/me'),
    api('/documents?limit=5'),
    api('/appointments?scope=upcoming').catch(() => null),
  ])
    .then(([p, e, d, a]) =>
      setData({ patient: p.patient, emergency: e.emergency, documents: d.documents, appointments: a })
    )
    .catch((err) => setError(err.message));
}, []);
  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Chargement...</p>;

  const { patient, emergency, documents, appointments } = data;
const next = appointments?.appointments[0];
const tz = appointments?.timezone;
  const missing = missingFields(patient);

  return (
    <>
      <header className="page-head">
        <h1>Bonjour {user.first_name}</h1>
        <p>
          {documents.length
            ? 'Voici vos derniers documents et votre fiche d’urgence.'
            : 'Votre coffre-fort est vide. Ajoutez une ordonnance ou des résultats d’analyses pour commencer.'}
        </p>
      </header>

      {appointments &&
  (next ? (
    <section className="next-appt" aria-label="Prochain rendez-vous">
      <div className="date-leaf" aria-hidden="true">
        <span>{monthShort(next.starts_at, tz)}</span>
        <strong>{dayNumber(next.starts_at, tz)}</strong>
      </div>
      <div>
        <p className="next-when">{relativeDay(next.starts_at, tz)}</p>
        <h2>
          {longDate(next.starts_at, tz)} à {timeLabel(next.starts_at, tz)}
        </h2>
        <p className="muted">
          Dr {next.practitioner_first_name} {next.practitioner_last_name}, {next.specialty}. {next.establishment_name},{' '}
          {next.city}.
        </p>
      </div>
      <Link className="button-link" to="/rendez-vous">
        Voir mes rendez-vous
      </Link>
    </section>
  ) : (
    <section className="next-appt empty-appt" aria-label="Prochain rendez-vous">
      <div>
        <h2>Aucun rendez-vous à venir</h2>
        <p className="muted">Trouvez un médecin et réservez un créneau en quelques clics.</p>
      </div>
      <Link className="button-link primary" to="/annuaire">
        Prendre un rendez-vous
      </Link>
    </section>
  ))}

      <HealthBanner />

      {missing.length > 0 && (
        <div className="notice">
          <p>
            <strong>Profil incomplet.</strong> Il manque : {missing.join(', ')}.
          </p>
          <Link className="button-link" to="/profil">
            Compléter mon profil
          </Link>
        </div>
      )}

      <div className="dash">
        <section className="panel" aria-labelledby="recent-title">
          <div className="panel-head">
            <h2 id="recent-title">Derniers documents</h2>
            <Link to="/documents">Voir tout</Link>
          </div>

          {documents.length === 0 ? (
            <div className="empty">
              <p>Aucun document pour le moment. Envoyez un PDF, une photo ou une capture : vous le retrouverez ici.</p>
              <Link className="button-link" to="/documents">
                Ajouter un document
              </Link>
            </div>
          ) : (
            <ul className="doc-rows">
              {documents.map((doc) => (
                <li key={doc.id} className="doc-row">
                  <span className="tab-mark" style={{ '--tab': TYPE_COLORS[doc.type] }} aria-hidden="true" />
                  <div>
                    <div className="doc-title">{doc.title}</div>
                    <div className="doc-type">{TYPES[doc.type]}</div>
                  </div>
                  <time>{formatDate(doc.document_date)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="id-card" aria-label="Fiche d’urgence">
          <div className="id-card-band">Fiche d’urgence</div>
          <div className="id-card-body">
            <p className="holder">
              {patient.first_name} {patient.last_name}
            </p>
            <dl>
              <dt>Groupe sanguin</dt>
              <dd>{patient.blood_group ? <span className="blood">{patient.blood_group}</span> : 'Non renseigné'}</dd>
              <dt>Allergies</dt>
              <dd>{emergency.allergies.length ? emergency.allergies.join(', ') : 'Aucune renseignée'}</dd>
            </dl>
            <p className={`status${emergency.is_public ? ' on' : ''}`}>
              {emergency.is_public ? 'Accessible par QR code' : 'Non partagée'}
            </p>
            <Link className="button-link" to="/urgence">
              Gérer ma fiche
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}