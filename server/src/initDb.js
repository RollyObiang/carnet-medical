import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8');

try {
  await pool.query(sql);
  console.log('Tables créées avec succès');
} catch (err) {
  console.error('Erreur :', err.message);
} finally {
  await pool.end();
} 