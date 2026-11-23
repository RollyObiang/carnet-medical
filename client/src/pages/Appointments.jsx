import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { dayNumber, longDate, monthShort, timeLabel } from '../dates.js';

export default function Appointments() {
  const location = useLocation();
  const [scope, setScope] = useState('upcoming');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(location.state?.booked ? 'Rendez-vous confirmé.' : '');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    api(`/appointments?scope=${scope}`)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError('');
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [scope, reloadKey]);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(''), 5000);
    return () => clearTimeout(timer);
  }, [flash]);

  async function cancel(a) {
    if (!window.confirm('Annuler ce rendez-vous ? Le créneau sera libéré pour d’autres patients.')) return;
    try {
      await api(`/appointments/${a.id}/cancel`, { method: 'POST' });
      setFlash('Rendez-vous annulé.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  const upcoming = scope === 'upcoming';

  return (
    <>
      <header className="page-head page-head-row">
        <div>
          <h1>Rendez-vous</h1>
          <p>Vos consultations à venir et votre historique.</p>
        </div>
        <Link className="button-link primary" to="/annuaire">
          Prendre un rendez-vous
        </Link>
      </header>

      {flash && (
        <p className="flash" role="status">
          {flash}
        </p>
      )}

      <div className="chips" role="group" aria-label="Période">
        <button type="button" className="chip" aria-pressed={upcoming} onClick={() => setScope('upcoming')}>
          À venir
        </button>
        <button type="button" className="chip" aria-pressed={!upcoming} onClick={() => setScope('history')}>
          Historique
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p>Chargement...</p>}

      {data && (
        <section className="panel" aria-label="Liste des rendez-vous">
          {data.appointments.length === 0 ? (
            <div className="empty">
              {upcoming ? (
                <>
                  <p>Vous n’avez aucun rendez-vous à venir. Trouvez un médecin dans l’annuaire et choisissez un créneau.</p>
                  <Link className="button-link" to="/annuaire">
                    Ouvrir l’annuaire
                  </Link>
                </>
              ) : (
                <p>Votre historique est vide.</p>
              )}
            </div>
          ) : (
            <ul className="doc-rows">
              {data.appointments.map((a) => (
                <li key={a.id} className={`appt-row${a.status === 'cancelled' ? ' is-cancelled' : ''}`}>
                  <div className="date-leaf" aria-hidden="true">
                    <span>{monthShort(a.starts_at, data.timezone)}</span>
                    <strong>{dayNumber(a.starts_at, data.timezone)}</strong>
                  </div>

                  <div>
                    <div className="doc-title">
                      <time dateTime={a.starts_at}>
                        {longDate(a.starts_at, data.timezone)} à {timeLabel(a.starts_at, data.timezone)}
                      </time>
                    </div>
                    <div className="place-lines">
                      <span>
                        {a.practitioner_title} {a.practitioner_first_name} {a.practitioner_last_name}, {a.specialty}
                      </span>
                      <span>
                        <Link to={`/annuaire/${a.establishment_id}`}>{a.establishment_name}</Link>
                        {a.address ? `, ${a.address}` : ''}
                      </span>
                      {a.reason && <span>Motif : {a.reason}</span>}
                    </div>
                  </div>

                  <div className="actions">
                    {upcoming ? (
                      <button type="button" className="danger" onClick={() => cancel(a)}>
                        Annuler
                      </button>
                    ) : (
                      <span className={`badge${a.status === 'cancelled' ? ' cancelled' : ''}`}>
                        {a.status === 'cancelled' ? 'Annulé' : 'Passé'}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}