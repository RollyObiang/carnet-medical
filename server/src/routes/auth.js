import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/requireAuth.js';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db.js';

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

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 1000, // 1 heure
};

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

  const token = jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '1h',
  });

  res.cookie('token', token, cookieOptions);
  res.json({ user: { id: user.id, email: user.email, role: user.role } });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: undefined });
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