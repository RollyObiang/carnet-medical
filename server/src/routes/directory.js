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
    conditions.push(`(e.name ILIKE $${params.length} OR e.city ILIKE $${params.length})`);
  }
  if (type) {
    params.push(type);
    conditions.push(`e.type = $${params.length}`);
  }
  if (specialty) {
    params.push(specialty);
    conditions.push(`EXISTS (
      SELECT 1 FROM practitioners px
      JOIN specialties sx ON sx.id = px.specialty_id
      WHERE px.establishment_id = e.id AND px.is_active AND sx.slug = $${params.length}
    )`);
  }

  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT e.id, e.name, e.type, e.city, e.address, e.phone, e.opening_hours,
            COALESCE(array_agg(DISTINCT s.name ORDER BY s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS specialties
     FROM establishments e
     LEFT JOIN practitioners p ON p.establishment_id = e.id AND p.is_active
     LEFT JOIN specialties s ON s.id = p.specialty_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY e.id
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
    `SELECT id, name, type, city, address, phone, opening_hours
     FROM establishments
     WHERE id = $1 AND is_active = true`,
    [id.data]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Structure introuvable' });

  const practitioners = await pool.query(
    `SELECT p.id, p.first_name, p.last_name, s.slug AS specialty_slug, s.name AS specialty
     FROM practitioners p
     JOIN specialties s ON s.id = p.specialty_id
     WHERE p.establishment_id = $1 AND p.is_active = true
     ORDER BY s.name, p.last_name, p.first_name`,
    [id.data]
  );

  res.json({ establishment: rows[0], practitioners: practitioners.rows });
});

export default router;