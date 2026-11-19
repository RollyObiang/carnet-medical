import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/requireAuth.js';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db.js';
import crypto from 'node:crypto';

const router = Router();

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(100),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Données invalides',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { email, password, first_name, last_name } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  const client = await pool.connect();
  try {
    // Transaction : le compte et le profil sont créés ensemble, ou pas du tout
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, role, created_at`,
      [email, passwordHash]
    );
    const user = rows[0];

    await client.query(
      'INSERT INTO patients (user_id, first_name, last_name) VALUES ($1, $2, $3)',
      [user.id, first_name, last_name]
    );

    await client.query('COMMIT');
    res.status(201).json({ user });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }
    throw err;
  } finally {
    client.release();
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ACCESS_TTL = '15m'; // durée du jeton d'accès
const ACCESS_MAX_AGE = 15 * 60 * 1000;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

const baseCookie = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};
const accessCookie = { ...baseCookie, maxAge: ACCESS_MAX_AGE };
// Le jeton de renouvellement n'est envoyé qu'aux routes /api/auth
const refreshCookie = { ...baseCookie, path: '/api/auth', maxAge: REFRESH_MAX_AGE };

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

function clearSessionCookies(res) {
  res.clearCookie('token', baseCookie);
  res.clearCookie('refresh', { ...baseCookie, path: '/api/auth' });
}

// Crée une session : jeton d'accès + jeton de renouvellement (seul son hash est stocké)
async function issueSession(res, user) {
  const access = jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: user.id,
    expiresIn: ACCESS_TTL,
  });
  const refresh = crypto.randomBytes(48).toString('base64url');
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '30 days')`,
    [user.id, hashToken(refresh)]
  );
  res.cookie('token', access, accessCookie);
  res.cookie('refresh', refresh, refreshCookie);
}

// Hash factice : on fait toujours un calcul bcrypt, même si l'email n'existe pas
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', 12);

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides' });
  }
  const { email, password } = parsed.data;

  const { rows } = await pool.query(
    'SELECT id, email, role, password_hash FROM users WHERE lower(email) = lower($1)',
    [email]
  );
  const user = rows[0];

  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) {
    // Même message dans les deux cas : on ne révèle pas si l'email existe
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  await issueSession(res, user);
  res.json({ user: { id: user.id, email: user.email, role: user.role } });
});

router.post('/refresh', async (req, res) => {
  const raw = req.cookies?.refresh;
  if (!raw) return res.status(401).json({ error: 'Non connecté' });

  const reject = () => {
    clearSessionCookies(res);
    return res.status(401).json({ error: 'Session expirée' });
  };

  const { rows } = await pool.query(
    `SELECT t.id, t.user_id, t.expires_at, t.revoked_at, u.role
     FROM refresh_tokens t
     JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = $1`,
    [hashToken(raw)]
  );
  const t = rows[0];
  if (!t) return reject();

  if (t.revoked_at) {
    const ageMs = Date.now() - new Date(t.revoked_at).getTime();
    // Juste après un renouvellement, c'est une simple course entre deux onglets : on refuse sans effacer les cookies
    if (ageMs < 10_000) return res.status(401).json({ error: 'Session en cours de renouvellement' });
    // Sinon, un ancien jeton est rejoué : possible vol, on coupe toutes les sessions
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
      [t.user_id]
    );
    return reject();
  }
  if (new Date(t.expires_at) < new Date()) return reject();

  // Rotation : l'ancien jeton est révoqué, un nouveau est émis
  const { rowCount } = await pool.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL',
    [t.id]
  );
  if (!rowCount) return res.status(401).json({ error: 'Session en cours de renouvellement' });

  await issueSession(res, { id: t.user_id, role: t.role });
  res.json({ ok: true });
});

router.post('/logout', async (req, res) => {
  const raw = req.cookies?.refresh;
  if (raw) {
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
      [hashToken(raw)]
    );
  }
  clearSessionCookies(res);
  res.json({ message: 'Déconnecté' });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.role, p.first_name, p.last_name
     FROM users u
     JOIN patients p ON p.user_id = u.id
     WHERE u.id = $1`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json({ user: rows[0] });
});

export default router;