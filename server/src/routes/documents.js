import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

const router = Router();
const fsp = fs.promises;

const here = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(here, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};
const DOC_TYPES = ['analyse', 'ordonnance', 'imagerie', 'compte_rendu', 'vaccination', 'autre'];

const DOC_COLUMNS = `
  id, type, title,
  to_char(document_date, 'YYYY-MM-DD') AS document_date,
  original_filename, mime_type, size_bytes::integer AS size_bytes, created_at`;

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // Nom aléatoire : on n'utilise jamais le nom envoyé par l'utilisateur
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10 Mo
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    cb(
      Object.assign(new Error('Type de fichier non autorisé (PDF, JPG ou PNG)'), {
        code: 'INVALID_FILE_TYPE',
      })
    );
  },
});

// Le type MIME envoyé par le client peut être falsifié : on vérifie les premiers octets
async function hasValidSignature(filePath, mime) {
  const handle = await fsp.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(8);
    await handle.read(buf, 0, 8, 0);
    if (mime === 'application/pdf') return buf.subarray(0, 4).toString('latin1') === '%PDF';
    if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (mime === 'image/png') {
      return buf.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    return false;
  } finally {
    await handle.close();
  }
}

const metaSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(DOC_TYPES).default('autre'),
  document_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => !Number.isNaN(Date.parse(d)), 'Date invalide')
    .optional(),
});

const listSchema = z.object({
  type: z.enum(DOC_TYPES).optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const idSchema = z.string().uuid();

async function getPatientId(userId) {
  const { rows } = await pool.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
  return rows[0]?.id;
}

// --- Envoyer un document ---
router.post('/', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Fichier manquant (champ "file")' });

  // En cas de refus, on supprime le fichier déjà écrit sur le disque
  const reject = async (status, error, details) => {
    await fsp.unlink(file.path).catch(() => {});
    return res.status(status).json({ error, details });
  };

  const parsed = metaSchema.safeParse(req.body);
  if (!parsed.success) {
    return reject(400, 'Données invalides', parsed.error.flatten().fieldErrors);
  }
  if (!(await hasValidSignature(file.path, file.mimetype))) {
    return reject(400, 'Le contenu du fichier ne correspond pas à son type');
  }

  const patientId = await getPatientId(req.user.id);
  if (!patientId) return reject(404, 'Profil introuvable');

  const { title, type, document_date } = parsed.data;
  try {
    const { rows } = await pool.query(
      `INSERT INTO documents
         (patient_id, type, title, document_date, storage_key, original_filename, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${DOC_COLUMNS}`,
      [patientId, type, title, document_date ?? null, file.filename, file.originalname, file.mimetype, file.size]
    );
    res.status(201).json({ document: rows[0] });
  } catch (err) {
    await fsp.unlink(file.path).catch(() => {});
    throw err;
  }
});

// --- Lister ses documents (filtres : type, q, limit, offset) ---
router.get('/', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Paramètres invalides',
      details: parsed.error.flatten().fieldErrors,
    });
  }
  const { type, q, limit, offset } = parsed.data;

  const patientId = await getPatientId(req.user.id);
  if (!patientId) return res.status(404).json({ error: 'Profil introuvable' });

  const conditions = ['patient_id = $1', 'deleted_at IS NULL'];
  const params = [patientId];

  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }
  if (q) {
    // On neutralise les caractères spéciaux de ILIKE (%, _, \)
    params.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
    conditions.push(`title ILIKE $${params.length}`);
  }

  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT ${DOC_COLUMNS}
     FROM documents
     WHERE ${conditions.join(' AND ')}
     ORDER BY document_date DESC NULLS LAST, created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  res.json({ documents: rows });
});

// --- Télécharger un document ---
router.get('/:id/download', async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Identifiant invalide' });

  // La jointure sur p.user_id garantit que le document appartient bien à l'utilisateur connecté
  const { rows } = await pool.query(
    `SELECT d.storage_key, d.original_filename
     FROM documents d
     JOIN patients p ON p.id = d.patient_id
     WHERE d.id = $1 AND p.user_id = $2 AND d.deleted_at IS NULL`,
    [id.data, req.user.id]
  );
  const doc = rows[0];
  // 404 (et non 403) : on ne révèle pas l'existence des documents des autres
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });

  res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  res.download(path.join(UPLOAD_DIR, doc.storage_key), doc.original_filename, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Fichier introuvable' });
  });
});

// --- Supprimer (suppression logique) ---
router.delete('/:id', async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Identifiant invalide' });

  const { rowCount } = await pool.query(
    `UPDATE documents d
     SET deleted_at = now()
     FROM patients p
     WHERE d.id = $1 AND d.patient_id = p.id AND p.user_id = $2 AND d.deleted_at IS NULL`,
    [id.data, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Document introuvable' });
  res.status(204).end();
});

export default router;