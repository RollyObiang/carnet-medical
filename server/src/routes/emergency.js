import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { pool } from '../db.js';

const router = Router();

const COLUMNS = 'allergies, current_medications, vital_notes, is_public, public_token';
const EMPTY = {
  allergies: [],
  current_medications: [],
  vital_notes: null,
  is_public: false,
  public_token: null,
};

const list = z.array(z.string().trim().min(1).max(100)).max(30);

const updateSchema = z
  .object({
    allergies: list,
    current_medications: list,
    vital_notes: z.string().trim().max(1000),
    is_public: z.boolean(),
  })
  .strict();

// 24 octets aléatoires : impossible à deviner
const newToken = () => crypto.randomBytes(24).toString('base64url');

async function getPatientId(userId) {
  const { rows } = await pool.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
  return rows[0]?.id;
}

router.get('/me', async (req, res) => {
  const patientId = await getPatientId(req.user.id);
  if (!patientId) return res.status(404).json({ error: 'Profil introuvable' });

  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM emergency_info WHERE patient_id = $1`,
    [patientId]
  );
  res.json({ emergency: rows[0] ?? EMPTY });
});

router.put('/me', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Données invalides',
      details: parsed.error.flatten().fieldErrors,
    });
  }
  const patientId = await getPatientId(req.user.id);
  if (!patientId) return res.status(404).json({ error: 'Profil introuvable' });

  const d = parsed.data;
  const { rows } = await pool.query(
    `INSERT INTO emergency_info
       (patient_id, allergies, current_medications, vital_notes, is_public, public_token)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (patient_id) DO UPDATE SET
       allergies = EXCLUDED.allergies,
       current_medications = EXCLUDED.current_medications,
       vital_notes = EXCLUDED.vital_notes,
       is_public = EXCLUDED.is_public,
       -- le lien existant est conservé ; un nouveau n'est créé que s'il n'y en avait pas
       public_token = COALESCE(emergency_info.public_token, EXCLUDED.public_token),
       updated_at = now()
     RETURNING ${COLUMNS}`,
    [patientId, d.allergies, d.current_medications, d.vital_notes || null, d.is_public, d.is_public ? newToken() : null]
  );
  res.json({ emergency: rows[0] });
});

// Si le QR code a été partagé par erreur : l'ancien lien cesse de fonctionner
router.post('/me/regenerate-link', async (req, res) => {
  const patientId = await getPatientId(req.user.id);
  if (!patientId) return res.status(404).json({ error: 'Profil introuvable' });

  const { rows } = await pool.query(
    `UPDATE emergency_info SET public_token = $1, updated_at = now()
     WHERE patient_id = $2
     RETURNING ${COLUMNS}`,
    [newToken(), patientId]
  );
  if (!rows[0]) return res.status(404).json({ error: "Fiche d'urgence non créée" });
  res.json({ emergency: rows[0] });
});

export default router;