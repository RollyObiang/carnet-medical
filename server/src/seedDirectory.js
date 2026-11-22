import { pool } from './db.js';

const SPECIALTIES = [
  ['medecine-generale', 'Médecine générale'],
  ['pediatrie', 'Pédiatrie'],
  ['gynecologie', 'Gynécologie-obstétrique'],
  ['cardiologie', 'Cardiologie'],
  ['dermatologie', 'Dermatologie'],
  ['ophtalmologie', 'Ophtalmologie'],
  ['dentisterie', 'Chirurgie dentaire'],
];

// Données fictives : à remplacer par de vraies structures
const ESTABLISHMENTS = [
  {
    name: 'Hôpital Exemple',
    type: 'hopital',
    city: 'Ville Exemple',
    address: '1 avenue de la Démonstration',
    phone: '+000 00 00 00 01',
    hours: 'Ouvert 24 h/24',
    doctors: [['Awa', 'Démo', 'medecine-generale'], ['Marc', 'Démo', 'cardiologie'], ['Lina', 'Démo', 'pediatrie']],
  },
  {
    name: 'Clinique Exemple du Port',
    type: 'clinique',
    city: 'Port Exemple',
    address: '12 rue du Littoral',
    phone: '+000 00 00 00 02',
    hours: 'Lundi au samedi, 8 h à 18 h',
    doctors: [['Sofia', 'Démo', 'gynecologie'], ['Karim', 'Démo', 'medecine-generale'], ['Élise', 'Démo', 'dermatologie']],
  },
  {
    name: 'Centre de santé Exemple',
    type: 'centre_sante',
    city: 'Ville Exemple',
    address: '8 rue du Marché',
    phone: '+000 00 00 00 03',
    hours: 'Lundi au vendredi, 7 h 30 à 16 h',
    doctors: [['Nadia', 'Démo', 'medecine-generale'], ['Paul', 'Démo', 'pediatrie']],
  },
  {
    name: 'Cabinet dentaire Exemple',
    type: 'cabinet',
    city: 'Port Exemple',
    address: '5 place de la Gare',
    phone: '+000 00 00 00 04',
    hours: 'Lundi au vendredi, 9 h à 17 h',
    doctors: [['Yanis', 'Démo', 'dentisterie']],
  },
  {
    name: 'Cabinet d’ophtalmologie Exemple',
    type: 'cabinet',
    city: 'Ville Exemple',
    address: '27 boulevard Central',
    phone: '+000 00 00 00 05',
    hours: 'Mardi au samedi, 9 h à 16 h',
    doctors: [['Clara', 'Démo', 'ophtalmologie']],
  },
  {
    name: 'Pharmacie Exemple',
    type: 'pharmacie',
    city: 'Ville Exemple',
    address: '3 avenue de la Démonstration',
    phone: '+000 00 00 00 06',
    hours: 'Tous les jours, 8 h à 20 h',
    doctors: [],
  },
  {
    name: 'Laboratoire d’analyses Exemple',
    type: 'laboratoire',
    city: 'Ville Exemple',
    address: '14 rue des Écoles',
    phone: '+000 00 00 00 07',
    hours: 'Lundi au samedi, 7 h à 15 h',
    doctors: [],
  },
];

try {
  for (const [slug, name] of SPECIALTIES) {
    await pool.query('INSERT INTO specialties (slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING', [
      slug,
      name,
    ]);
  }

  const { rows } = await pool.query('SELECT count(*)::int AS n FROM establishments');
  if (rows[0].n > 0) {
    console.log('Des structures existent déjà : aucune donnée de démonstration ajoutée');
  } else {
    for (const e of ESTABLISHMENTS) {
      const { rows: created } = await pool.query(
        `INSERT INTO establishments (name, type, city, address, phone, opening_hours)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [e.name, e.type, e.city, e.address, e.phone, e.hours]
      );
      for (const [first, last, slug] of e.doctors) {
        await pool.query(
          `INSERT INTO practitioners (establishment_id, specialty_id, first_name, last_name)
           SELECT $1, id, $2, $3 FROM specialties WHERE slug = $4`,
          [created[0].id, first, last, slug]
        );
      }
    }
    console.log('Données de démonstration ajoutées');
  }
} catch (err) {
  console.error('Erreur :', err.message);
} finally {
  await pool.end();
}