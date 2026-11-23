import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';

const router = Router();

const TYPES = ['hopital', 'clinique', 'centre_sante', 'cabinet', 'pharmacie', 'laboratoire'];

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: z.enum(TYPES).optional(),
  specialty: z.string().regex(/^[a-z0-9-]{1,60}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const idSchema = z.string().uuid();

// Spécialités d'une structure : celles de ses médecins, plus celles déclarées pour la structure elle-même
const SPECIALTY_NAMES = `COALESCE((
  SELECT array_agg(t.name ORDER BY t.name) FROM (
    SELECT s.name FROM establishment_specialties es
      JOIN specialties s ON s.id = es.specialty_id
      WHERE es.establishment_id = e.id
    UNION
    SELECT s.name FROM practitioners p
      JOIN specialties s ON s.id = p.specialty_id
      WHERE p.establishment_id = e.id AND p.is_active
  ) t
), '{}')`;

router.get('/specialties', async (req, res) => {
  const { rows } = await pool.query('SELECT slug, name FROM specialties ORDER BY name');
  res.json({ specialties: rows });
});

router.get('/establishments', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Paramètres invalides',
      details: parsed.error.flatten().fieldErrors,
    });
  }
  const { q, type, specialty, limit, offset } = parsed.data;

  const conditions = ['e.is_active = true'];
  const params = [];

  if (q) {
    // On neutralise les caractères spéciaux de ILIKE (%, _, \)
    params.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
    conditions.push(`(e.name ILIKE $${params.length} OR e.city ILIKE $${params.length} OR e.address ILIKE $${params.length})`);
  }
  if (type) {
    params.push(type);
    conditions.push(`e.type = $${params.length}`);
  }
  if (specialty) {
    params.push(specialty);
    conditions.push(`EXISTS (
      SELECT 1 FROM specialties sx
      WHERE sx.slug = $${params.length}
        AND (
          EXISTS (SELECT 1 FROM establishment_specialties es WHERE es.establishment_id = e.id AND es.specialty_id = sx.id)
          OR EXISTS (SELECT 1 FROM practitioners px WHERE px.establishment_id = e.id AND px.is_active AND px.specialty_id = sx.id)
        )
    )`);
  }

  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT e.id, e.name, e.type, e.city, e.address, e.phone, e.opening_hours,
            ${SPECIALTY_NAMES} AS specialties
     FROM establishments e
     WHERE ${conditions.join(' AND ')}
     ORDER BY e.name
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  res.json({ establishments: rows });
});

router.get('/establishments/:id', async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Identifiant invalide' });

  const { rows } = await pool.query(
    `SELECT e.id, e.name, e.type, e.city, e.address, e.phone, e.opening_hours,
            ${SPECIALTY_NAMES} AS specialties
     FROM establishments e
     WHERE e.id = $1 AND e.is_active = true`,
    [id.data]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Structure introuvable' });

  const practitioners = await pool.query(
    `SELECT p.id, p.title, p.first_name, p.last_name,
            s.slug AS specialty_slug, s.name AS specialty,
            EXISTS (SELECT 1 FROM availabilities a WHERE a.practitioner_id = p.id) AS bookable
     FROM practitioners p
     JOIN specialties s ON s.id = p.specialty_id
     WHERE p.establishment_id = $1 AND p.is_active = true
     ORDER BY s.name, p.last_name, p.first_name`,
    [id.data]
  );

  res.json({ establishment: rows[0], practitioners: practitioners.rows });
});

router.get('/practitioners/:id', async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Identifiant invalide' });

  const { rows } = await pool.query(
    `SELECT p.id, p.title, p.first_name, p.last_name, s.name AS specialty,
            e.id AS establishment_id, e.name AS establishment_name, e.city, e.address, e.phone
     FROM practitioners p
     JOIN specialties s ON s.id = p.specialty_id
     JOIN establishments e ON e.id = p.establishment_id
     WHERE p.id = $1 AND p.is_active = true AND e.is_active = true`,
    [id.data]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Médecin introuvable' });
  res.json({ practitioner: rows[0] });
});

export default router;