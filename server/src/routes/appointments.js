import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';

const router = Router();

// Les horaires des médecins sont exprimés dans ce fuseau
const TZ = process.env.APP_TIMEZONE || 'UTC';
try {
  new Intl.DateTimeFormat('fr-FR', { timeZone: TZ });
} catch {
  throw new Error(`APP_TIMEZONE invalide : ${TZ}`);
}

const isRealDate = (s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const slotsSchema = z.object({
  practitioner_id: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isRealDate, 'Date invalide').optional(),
  days: z.coerce.number().int().min(1).max(31).default(14),
});

const bookSchema = z
  .object({
    practitioner_id: z.string().uuid(),
    starts_at: z.string().datetime({ offset: true }),
    reason: z.string().trim().max(300).optional(),
  })
  .strict();

const listSchema = z.object({ scope: z.enum(['upcoming', 'history']).default('upcoming') });
const idSchema = z.string().uuid();

// Créneaux libres : plages horaires découpées en créneaux, moins les rendez-vous confirmés.
// Réservation possible entre 1 heure et 60 jours à l'avance.
const SLOTS_SQL = `
  WITH days AS (
    SELECT (COALESCE($2::date, (now() AT TIME ZONE $3::text)::date) + n) AS day
    FROM generate_series(0, $4::int - 1) AS n
  ),
  slots AS (
    SELECT gs AS starts_at
    FROM days d
    JOIN availabilities a
      ON a.practitioner_id = $1::uuid AND a.weekday = EXTRACT(ISODOW FROM d.day)::int
    CROSS JOIN LATERAL generate_series(
      (d.day + a.start_time) AT TIME ZONE $3::text,
      (d.day + a.end_time - make_interval(mins => a.slot_minutes)) AT TIME ZONE $3::text,
      make_interval(mins => a.slot_minutes)
    ) AS gs
  )
  SELECT s.starts_at
  FROM slots s
  WHERE s.starts_at > now() + interval '1 hour'
    AND s.starts_at < now() + interval '60 days'
    AND NOT EXISTS (
      SELECT 1 FROM appointments ap
      WHERE ap.practitioner_id = $1::uuid AND ap.starts_at = s.starts_at AND ap.status = 'confirmed'
    )
    AND EXISTS (
      SELECT 1 FROM practitioners p
      JOIN establishments e ON e.id = p.establishment_id
      WHERE p.id = $1::uuid AND p.is_active AND e.is_active
    )
  ORDER BY s.starts_at`;

// Réservation : l'heure demandée doit correspondre exactement à un créneau valide
const BOOK_SQL = `
  WITH target AS (
    SELECT ($3::timestamptz AT TIME ZONE $5::text)::date AS day
  ),
  valid AS (
    SELECT gs AS starts_at, gs + make_interval(mins => a.slot_minutes) AS ends_at
    FROM target t
    JOIN availabilities a
      ON a.practitioner_id = $2::uuid AND a.weekday = EXTRACT(ISODOW FROM t.day)::int
    CROSS JOIN LATERAL generate_series(
      (t.day + a.start_time) AT TIME ZONE $5::text,
      (t.day + a.end_time - make_interval(mins => a.slot_minutes)) AT TIME ZONE $5::text,
      make_interval(mins => a.slot_minutes)
    ) AS gs
  )
  INSERT INTO appointments (patient_id, practitioner_id, starts_at, ends_at, reason)
  SELECT $1::uuid, $2::uuid, v.starts_at, v.ends_at, $4::text
  FROM valid v
  WHERE v.starts_at = $3::timestamptz
    AND v.starts_at > now() + interval '1 hour'
    AND v.starts_at < now() + interval '60 days'
  RETURNING id, starts_at, ends_at, status`;

async function getPatientId(userId) {
  const { rows } = await pool.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
  return rows[0]?.id;
}

router.get('/slots', async (req, res) => {
  const parsed = slotsSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Paramètres invalides',
      details: parsed.error.flatten().fieldErrors,
    });
  }
  const { practitioner_id, from, days } = parsed.data;
  const { rows } = await pool.query(SLOTS_SQL, [practitioner_id, from ?? null, TZ, days]);
  res.json({ timezone: TZ, slots: rows.map((r) => r.starts_at) });
});

router.post('/', async (req, res) => {
  const parsed = bookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Données invalides',
      details: parsed.error.flatten().fieldErrors,
    });
  }
  const { practitioner_id, starts_at, reason } = parsed.data;

  const patientId = await getPatientId(req.user.id);
  if (!patientId) return res.status(404).json({ error: 'Profil introuvable' });

  const practitioner = await pool.query(
    `SELECT 1 FROM practitioners p
     JOIN establishments e ON e.id = p.establishment_id
     WHERE p.id = $1 AND p.is_active AND e.is_active`,
    [practitioner_id]
  );
  if (!practitioner.rowCount) return res.status(404).json({ error: 'Médecin introuvable' });

  try {
    const { rows } = await pool.query(BOOK_SQL, [patientId, practitioner_id, starts_at, reason || null, TZ]);
    if (!rows[0]) {
      return res.status(409).json({ error: 'Ce créneau n’est plus disponible. Choisissez-en un autre.' });
    }
    res.status(201).json({ appointment: rows[0] });
  } catch (err) {
    // 23505 : l'index unique a bloqué une double réservation
    if (err.code === '23505') {
      const message =
        err.constraint === 'appointments_patient_slot_unique'
          ? 'Vous avez déjà un rendez-vous à cette heure.'
          : 'Ce créneau vient d’être réservé par quelqu’un d’autre. Choisissez-en un autre.';
      return res.status(409).json({ error: message });
    }
    throw err;
  }
});

router.get('/', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Paramètres invalides' });

  const patientId = await getPatientId(req.user.id);
  if (!patientId) return res.status(404).json({ error: 'Profil introuvable' });

  const upcoming = parsed.data.scope === 'upcoming';
  const { rows } = await pool.query(
    `SELECT ap.id, ap.starts_at, ap.ends_at, ap.status, ap.reason,
            p.first_name AS practitioner_first_name, p.last_name AS practitioner_last_name,
            s.name AS specialty,
            e.id AS establishment_id, e.name AS establishment_name, e.city, e.address, e.phone
     FROM appointments ap
     JOIN practitioners p ON p.id = ap.practitioner_id
     JOIN specialties s ON s.id = p.specialty_id
     JOIN establishments e ON e.id = p.establishment_id
     WHERE ap.patient_id = $1
       AND ${upcoming ? "ap.status = 'confirmed' AND ap.starts_at >= now()" : "NOT (ap.status = 'confirmed' AND ap.starts_at >= now())"}
     ORDER BY ap.starts_at ${upcoming ? 'ASC' : 'DESC'}
     LIMIT 50`,
    [patientId]
  );
  res.json({ timezone: TZ, appointments: rows });
});

router.post('/:id/cancel', async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Identifiant invalide' });

  const patientId = await getPatientId(req.user.id);
  if (!patientId) return res.status(404).json({ error: 'Profil introuvable' });

  // Seul le patient concerné peut annuler, et seulement un rendez-vous à venir
  const { rowCount } = await pool.query(
    `UPDATE appointments
     SET status = 'cancelled', cancelled_at = now()
     WHERE id = $1 AND patient_id = $2 AND status = 'confirmed' AND starts_at > now()`,
    [id.data, patientId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Rendez-vous introuvable ou déjà passé' });
  res.status(204).end();
});

export default router;