import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';

const router = Router();
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{20,64}$/);

router.get('/emergency/:token', async (req, res) => {
  // Ces en-têtes empêchent la mise en cache et l'indexation de la fiche
  res.set({
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
  });

  const token = tokenSchema.safeParse(req.params.token);
  if (!token.success) return res.status(404).json({ error: 'Fiche introuvable' });

  // Uniquement les champs vitaux, et seulement si le patient a activé le partage
  const { rows } = await pool.query(
    `SELECT p.first_name, p.last_name, p.blood_group,
            p.emergency_contact_name, p.emergency_contact_phone,
            e.allergies, e.current_medications, e.vital_notes
     FROM emergency_info e
     JOIN patients p ON p.id = e.patient_id
     WHERE e.public_token = $1 AND e.is_public = true`,
    [token.data]
  );
  // Même réponse pour « inexistante » et « désactivée »
  if (!rows[0]) return res.status(404).json({ error: 'Fiche introuvable' });
  res.json({ emergency: rows[0] });
});

export default router;