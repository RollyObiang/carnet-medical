import { pool } from './db.js';

// Trois modèles d'horaires, répartis entre les médecins. Jours : 1 = lundi ... 7 = dimanche
const PATTERNS = [
  { days: [1, 2, 3, 4, 5], windows: [['08:00', '12:00'], ['14:00', '17:00']], slot: 30 },
  { days: [2, 3, 4, 5, 6], windows: [['09:00', '13:00']], slot: 30 },
  { days: [1, 3, 5], windows: [['08:00', '12:00'], ['13:30', '16:00']], slot: 20 },
];

try {
  const { rows: existing } = await pool.query('SELECT count(*)::int AS n FROM availabilities');
  if (existing[0].n > 0) {
    console.log('Des horaires existent déjà : aucune donnée de démonstration ajoutée');
  } else {
    const { rows: practitioners } = await pool.query('SELECT id FROM practitioners ORDER BY created_at, id');
    let count = 0;
    for (const [i, p] of practitioners.entries()) {
      const pattern = PATTERNS[i % PATTERNS.length];
      for (const day of pattern.days) {
        for (const [start, end] of pattern.windows) {
          await pool.query(
            `INSERT INTO availabilities (practitioner_id, weekday, start_time, end_time, slot_minutes)
             VALUES ($1, $2, $3, $4, $5)`,
            [p.id, day, start, end, pattern.slot]
          );
          count++;
        }
      }
    }
    console.log(`${count} plages horaires ajoutées pour ${practitioners.length} médecins`);
  }
} catch (err) {
  console.error('Erreur :', err.message);
} finally {
  await pool.end();
}