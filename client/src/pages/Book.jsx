import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { dayKey, dayParts, longDate, timeLabel } from '../dates.js';

export default function Book() {
  const { practitionerId } = useParams();
  const navigate = useNavigate();
  const [practitioner, setPractitioner] = useState(null);
  const [slotData, setSlotData] = useState(null);
  const [day, setDay] = useState('');
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [bookError, setBookError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSlots = useCallback(async () => {
    const data = await api(`/appointments/slots?practitioner_id=${practitionerId}&days=30`);
    setSlotData(data);
    // On garde le jour choisi s'il a encore des créneaux, sinon on prend le premier jour libre
    setDay((current) => {
      const keys = new Set(data.slots.map((iso) => dayKey(iso, data.timezone)));
      if (current && keys.has(current)) return current;
      return data.slots.length ? dayKey(data.slots[0], data.timezone) : '';
    });
  }, [practitionerId]);

  useEffect(() => {
    Promise.all([api(`/directory/practitioners/${practitionerId}`), loadSlots()])
      .then(([p]) => setPractitioner(p.practitioner))
      .catch((err) => setError(err.message));
  }, [practitionerId, loadSlots]);

  const byDay = useMemo(() => {
    const groups = {};
    if (slotData) {
      for (const iso of slotData.slots) {
        (groups[dayKey(iso, slotData.timezone)] ??= []).push(iso);
      }
    }
    return groups;
  }, [slotData]);

  async function confirm() {
    setSubmitting(true);
    setBookError('');
    try {
      await api('/appointments', {
        method: 'POST',
        body: { practitioner_id: practitionerId, starts_at: selected, reason: reason.trim() || undefined },
      });
      navigate('/rendez-vous', { state: { booked: true } });
    } catch (err) {
      setBookError(err.message);
      if (err.status === 409) {
        // Le créneau a été pris entre-temps : on rafraîchit la liste
        setSelected(null);
        await loadSlots().catch(() => {});
      }
      setSubmitting(false);
    }
  }

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
  if (!practitioner || !slotData) return <p>Chargement...</p>;

  const tz = slotData.timezone;
  const days = Object.keys(byDay);

  return (
    <>
      <p>
        <Link to={`/annuaire/${practitioner.establishment_id}`}>Retour à {practitioner.establishment_name}</Link>
      </p>

      <header className="page-head">
        <h1>Prendre rendez-vous</h1>
        <p>
          Dr {practitioner.first_name} {practitioner.last_name}, {practitioner.specialty}. {practitioner.establishment_name},{' '}
          {practitioner.city}.
        </p>
      </header>

      <div className="book-layout">
        <section className="panel" aria-label="Choix du créneau">
          {days.length === 0 ? (
            <div className="empty">
              <p>Aucun créneau n’est disponible dans les 30 prochains jours pour ce médecin.</p>
              <Link className="button-link" to={`/annuaire/${practitioner.establishment_id}`}>
                Voir les autres médecins
              </Link>
            </div>
          ) : (
            <>
              <div className="panel-head">
                <h2>Choisissez un jour</h2>
              </div>
              <div className="days">
                {days.map((key) => {
                  const p = dayParts(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className="day"
                      aria-pressed={key === day}
                      onClick={() => {
                        setDay(key);
                        setSelected(null);
                        setBookError('');
                      }}
                    >
                      <span>{p.weekday}</span>
                      <strong>{p.day}</strong>
                      <span>{p.month}</span>
                    </button>
                  );
                })}
              </div>

              <div className="panel-head">
                <h2>Choisissez une heure</h2>
              </div>
              <div className="slots">
                {(byDay[day] ?? []).map((iso) => (
                  <button
                    key={iso}
                    type="button"
                    className="slot"
                    aria-pressed={iso === selected}
                    onClick={() => {
                      setSelected(iso);
                      setBookError('');
                    }}
                  >
                    {timeLabel(iso, tz)}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="panel summary" aria-label="Récapitulatif">
          <div className="panel-head">
            <h2>Votre rendez-vous</h2>
          </div>
          <div className="summary-body">
            {selected ? (
              <>
                <p className="summary-when">
                  {longDate(selected, tz)}
                  <br />à {timeLabel(selected, tz)}
                </p>
                <p>
                  Dr {practitioner.first_name} {practitioner.last_name}
                  <br />
                  {practitioner.establishment_name}
                  {practitioner.address && (
                    <>
                      <br />
                      {practitioner.address}, {practitioner.city}
                    </>
                  )}
                </p>
                <label>
                  Motif (facultatif)
                  <textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
                </label>
              </>
            ) : (
              <p className="muted">Choisissez un jour et une heure pour continuer.</p>
            )}

            {bookError && (
              <p className="error" role="alert">
                {bookError}
              </p>
            )}

            <button type="button" disabled={!selected || submitting} onClick={confirm}>
              {submitting ? 'Confirmation...' : 'Confirmer le rendez-vous'}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}