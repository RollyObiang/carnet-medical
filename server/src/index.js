import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { pool } from './db.js';
import { requireAuth } from './middleware/requireAuth.js';
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import documentRoutes from './routes/documents.js';
import rateLimit from 'express-rate-limit';
import emergencyRoutes from './routes/emergency.js';
import publicRoutes from './routes/public.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', database: 'down' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', requireAuth, patientRoutes);
app.use('/api/documents', requireAuth, documentRoutes);
app.use('/api/emergency', requireAuth, emergencyRoutes);

// Route publique : limitée à 60 requêtes / 15 min par adresse IP, contre le balayage de jetons
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/public', publicLimiter, publicRoutes);

// Gestion des erreurs : toujours en JSON, sans détails techniques pour le client
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Fichier trop volumineux (10 Mo maximum)'
        : "Erreur lors de l'envoi du fichier";
    return res.status(400).json({ error: message });
  }
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});