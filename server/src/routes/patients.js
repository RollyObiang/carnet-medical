import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';

const router = Router();

// to_char évite les décalages de fuseau horaire sur les dates
const PROFILE_COLUMNS = `
  first_name, last_name,
  to_char(birth_date, 'YYYY-MM-DD') AS birth_date,
  sex, blood_group, phone,
  emergency_contact_name, emergency_contact_phone`;

const updateSchema = z
  .object({
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().min(1).max(100),
    birth_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((d) => !Number.isNaN(Date.parse(d)) && new Date(d) <= new Date(), 'Date invalide'),
    sex: z.enum(['F', 'M', 'autre']),
    blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    phone: z.string().trim().max(30),
    emergency_contact_name: z.string().trim().max(100),
    emergency_contact_phone: z.string().trim().max(30),
  })
  .partial() // tous les champs sont optionnels
  .strict(); // les champs inconnus sont refusés

router.get('/me', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.email, ${PROFILE_COLUMNS}
     FROM patients p
     JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Profil introuvable' });
  res.json({ patient: rows[0] });
});

router.patch('/me', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Données invalides',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const fields = Object.keys(parsed.data);
  if (fields.length === 0) {
    return res.status(400).json({ error: 'Aucune donnée à modifier' });
  }

  // Les noms de colonnes viennent du schéma validé (strict), jamais du client
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = fields.map((f) => parsed.data[f]);

  const { rows } = await pool.query(
    `UPDATE patients SET ${setClause}
     WHERE user_id = $${values.length + 1}
     RETURNING ${PROFILE_COLUMNS}`,
    [...values, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Profil introuvable' });
  res.json({ patient: rows[0] });
});

export default router;