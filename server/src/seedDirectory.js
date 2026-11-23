import { pool } from './db.js';

const CITY = 'Libreville';
const H24 = 'Lundi au dimanche, 24 h/24';

const SPECIALTIES = [
  ['medecine-generale', 'Médecine générale'],
  ['medecine-interne', 'Médecine interne'],
  ['pediatrie', 'Pédiatrie'],
  ['gynecologie', 'Gynécologie-obstétrique'],
  ['cardiologie', 'Cardiologie'],
  ['dentisterie', 'Chirurgie dentaire'],
  ['ophtalmologie', 'Ophtalmologie'],
];

// Source : répertoire des établissements de santé de Libreville (PDF fourni).
// Chaque médecin : [titre, prénom, nom, spécialité]
const ESTABLISHMENTS = [
  // ---------- Hôpitaux et cliniques ----------
  {
    name: 'Centre Hospitalier Universitaire de Libreville (CHUL)',
    type: 'hopital',
    address: '356 rue Ndende (derrière l’Hôpital Général)',
    phone: '066 42 50 52',
    hours: H24,
    // La directrice générale n'est pas listée : rôle administratif, pas de consultation
    doctors: [['Dr', 'Annick Flore', 'Mfoumou Essono', 'medecine-interne']],
  },
  {
    name: 'CHU Fondation Jeanne Ebori',
    type: 'hopital',
    address: 'Route L101',
    phone: '04 68 64 53',
    hours: H24,
    doctors: [
      ['Dr', 'Simon', 'Ategbo', 'pediatrie'],
      ['Pr', 'Jean-François', 'Meyé', 'gynecologie'],
    ],
  },
  {
    name: 'Centre Diagnostic de Libreville (CDL)',
    type: 'clinique',
    address: 'Avenue Jean-Paul II',
    phone: '077 63 00 00',
    hours: `${H24} (ophtalmologie : consultations sur rendez-vous)`,
    specialties: ['ophtalmologie'],
    // Dr Cheikh Diakité (consultations ponctuelles) : spécialité non précisée dans la source, à ajouter
    doctors: [],
  },
  {
    name: 'Polyclinique Dr Chambrier',
    type: 'clinique',
    address: 'Centre-ville (Plus Code 9CWW+Q8G)',
    phone: '01 76 14 68',
    hours: H24,
    doctors: [
      ['Dr', 'Marceline Aworet', 'Chambrier Alawoe', 'gynecologie'],
      ['Dr', 'Urbain', 'Alawoe', 'cardiologie'],
    ],
  },
  {
    name: 'Polyclinique des Spécialistes',
    type: 'clinique',
    address: 'Quartier London (BP 4060)',
    phone: '065 19 80 80',
    hours: H24,
    doctors: [],
  },

  // ---------- Centres de santé et cabinets de groupe ----------
  {
    name: 'Centre de santé de Lalala',
    type: 'centre_sante',
    address: 'Route L101, Lalala (Plus Code 9F98+3GV)',
    phone: '077 06 55 16',
    hours: 'En journée, en semaine (horaires précis non communiqués)',
    doctors: [],
  },
  {
    name: 'Cabinet de Groupe Clinic',
    type: 'cabinet',
    address: 'Centre-ville (Plus Code 9CWV+676)',
    phone: '011 74 31 31',
    hours: H24,
    doctors: [['Dr', 'Steve', "Minto'o Rogombe", 'pediatrie']],
  },
  {
    name: 'Cabinet Médical d’Oloumi',
    type: 'cabinet',
    address: 'Zone industrielle d’Oloumi, derrière BGFIBank',
    phone: '011 74 43 16 / 066 78 08 29',
    hours: 'Lundi au vendredi, 7 h 30 à 17 h 30. Samedi, 7 h 30 à 12 h 30',
    doctors: [['Dr', 'Maryvonne', 'Kombila', 'medecine-generale']],
  },

  // ---------- Cabinets dentaires ----------
  {
    name: 'Cabinet Dentaire Lilia',
    type: 'cabinet',
    address: 'École publique de Glass (BP 5562)',
    phone: '062 01 14 01',
    hours: 'Lundi au vendredi, 8 h à 17 h',
    doctors: [
      ['Dr', 'Anne', 'Cabon', 'dentisterie'],
      ['Dr', 'Hans Helder', 'Boussamba Kouka', 'dentisterie'],
      ['Dr', 'Johanna', 'Barrera', 'dentisterie'],
    ],
  },
  {
    name: 'Cabinet Dentaire Villeneuve',
    type: 'cabinet',
    address: 'Libreville (BP 20369)',
    phone: '066 53 91 91',
    hours: 'Lundi au samedi, 8 h à 19 h',
    doctors: [['Dr', 'Étienne', 'Villeneuve', 'dentisterie']],
  },
  {
    name: 'Cabinet Dentaire Mbe Emane',
    type: 'cabinet',
    address: 'Descente Jeanne Ebori',
    phone: '066 49 85 00',
    hours: 'Lundi au vendredi, 8 h à 18 h. Samedi, 8 h à 14 h',
    doctors: [['Dr', 'Glorieuse', 'Sebatigita Mbe Emane', 'dentisterie']],
  },
  {
    name: 'Cabinet Dentaire du Lac',
    type: 'cabinet',
    address: 'Libreville (BP 8748)',
    phone: '065 02 19 92',
    hours: 'Lundi au vendredi, 8 h à 18 h. Samedi, 9 h à 13 h',
    specialties: ['dentisterie'],
    doctors: [],
  },

  // ---------- Cabinets d'ophtalmologie ----------
  {
    name: 'Coli Vision',
    type: 'cabinet',
    address: 'Boulevard Yves Digo (Plus Code 9FQ3+567)',
    phone: '077 53 01 81',
    hours: 'Sur rendez-vous, en semaine',
    specialties: ['ophtalmologie'],
    doctors: [],
  },
  {
    name: 'Gabon Vision',
    type: 'cabinet',
    address: 'Libreville (Plus Code 8FPV+3Q4)',
    phone: '066 23 69 50',
    hours: 'Horaires non communiqués : contacter par téléphone',
    specialties: ['ophtalmologie'],
    doctors: [],
  },
  {
    name: 'Inter Entreprises (Ophtalmologie)',
    type: 'cabinet',
    address: 'Libreville (Plus Code 9FM8+8GM)',
    phone: '06 20 29 98',
    hours: 'Lundi au vendredi, 8 h à 18 h. Samedi, 8 h 30 à 12 h 30',
    specialties: ['ophtalmologie'],
    doctors: [],
  },

  // ---------- Pharmacies ----------
  {
    name: 'Pharmacie Sainte-Marie',
    type: 'pharmacie',
    address: '198 boulevard Omar Bongo Ondimba (face Mbolo)',
    phone: '011 74 00 52 / 060 05 44 26',
    hours: 'Lundi au samedi, 7 h 30 à 21 h. Dimanche et jours fériés, 8 h à 20 h',
    doctors: [],
  },
  {
    name: 'La Nouvelle Pharmacie d’Awondo',
    type: 'pharmacie',
    address: '1066 avenue Jean-Jacques Boucavel, quartier Louis',
    phone: '066 15 80 00',
    hours: H24,
    doctors: [],
  },
  {
    name: 'Pharmacie Nouo Cécile',
    type: 'pharmacie',
    address: 'Entrée Ozangué, échangeur d’IAI',
    phone: '066 98 02 76',
    hours: H24,
    doctors: [],
  },
  {
    name: 'Pharmacie de Garde de Nzeng Ayong',
    type: 'pharmacie',
    address: 'Rond-point Nzeng Ayong (Plus Code CFCG+35M)',
    phone: '066 06 49 62',
    hours: H24,
    doctors: [],
  },
  {
    name: 'Pharmacie Le Maïs',
    type: 'pharmacie',
    address: 'PK9 (Plus Code CG34+F5C)',
    phone: '077 28 37 81',
    hours: H24,
    doctors: [],
  },

  // ---------- Laboratoires d'analyses ----------
  {
    name: 'Cerba Lancet Gabon (ex-Berthonneau)',
    type: 'laboratoire',
    address: 'Boulevard de l’Indépendance (Plus Code 9CQV+M6Q)',
    phone: '011 72 50 50',
    hours: 'Lundi au vendredi, 7 h 30 à 18 h. Samedi, 7 h 30 à 12 h',
    doctors: [],
  },
  {
    name: 'Laboratoire National de Santé Publique',
    type: 'laboratoire',
    address: '356 rue Ndende (locaux de la Médecine du travail)',
    phone: '060 23 23 67',
    hours: 'Lundi au vendredi, 7 h 30 à 15 h 30',
    doctors: [],
  },
  {
    name: 'Laboratoire d’Analyses Médicales de Louis',
    type: 'laboratoire',
    address: 'Boulevard Joseph Deemin, quartier Louis',
    phone: '077 91 75 83',
    hours: 'Lundi au vendredi, 7 h à 17 h. Samedi, 7 h à 13 h',
    doctors: [],
  },
  {
    name: 'Laboratoire du Centre Diagnostic de Libreville',
    type: 'laboratoire',
    address: 'Avenue Jean-Paul II',
    phone: '077 63 00 00',
    hours: H24,
    doctors: [],
  },
];

const client = await pool.connect();
try {
  await client.query('BEGIN');

  // 1. Retire les anciennes données de démonstration (noms contenant « Exemple »)
  //    et les rendez-vous de test qui y étaient liés
  await client.query(
    `DELETE FROM appointments
     WHERE practitioner_id IN (
       SELECT p.id FROM practitioners p
       JOIN establishments e ON e.id = p.establishment_id
       WHERE e.name LIKE '%Exemple%')`
  );
  const removed = await client.query(`DELETE FROM establishments WHERE name LIKE '%Exemple%'`);

  // 2. Spécialités
  for (const [slug, name] of SPECIALTIES) {
    await client.query(
      `INSERT INTO specialties (slug, name) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
      [slug, name]
    );
  }

  // 3. Structures : celles qui existent déjà (même nom, même ville) sont ignorées
  let added = 0;
  let skipped = 0;
  let doctors = 0;
  for (const e of ESTABLISHMENTS) {
    const existing = await client.query(
      'SELECT 1 FROM establishments WHERE lower(name) = lower($1) AND lower(city) = lower($2)',
      [e.name, CITY]
    );
    if (existing.rowCount) {
      skipped++;
      continue;
    }

    const { rows } = await client.query(
      `INSERT INTO establishments (name, type, city, address, phone, opening_hours)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [e.name, e.type, CITY, e.address, e.phone, e.hours]
    );
    const id = rows[0].id;

    for (const slug of e.specialties ?? []) {
      await client.query(
        `INSERT INTO establishment_specialties (establishment_id, specialty_id)
         SELECT $1, id FROM specialties WHERE slug = $2`,
        [id, slug]
      );
    }
    for (const [title, first, last, slug] of e.doctors ?? []) {
      await client.query(
        `INSERT INTO practitioners (establishment_id, specialty_id, title, first_name, last_name)
         SELECT $1, id, $2, $3, $4 FROM specialties WHERE slug = $5`,
        [id, title, first, last, slug]
      );
      doctors++;
    }
    added++;
  }

  // 4. Retire les spécialités qui ne servent plus (anciennes données de démonstration)
  await client.query(
    `DELETE FROM specialties s
     WHERE NOT EXISTS (SELECT 1 FROM practitioners p WHERE p.specialty_id = s.id)
       AND NOT EXISTS (SELECT 1 FROM establishment_specialties es WHERE es.specialty_id = s.id)`
  );

  await client.query('COMMIT');
  console.log(
    `${added} structures ajoutées (${doctors} médecins), ${skipped} déjà présentes, ${removed.rowCount} structures de démonstration supprimées`
  );
} catch (err) {
  await client.query('ROLLBACK');
  console.error('Erreur, rien n’a été modifié :', err.message);
} finally {
  client.release();
  await pool.end();
}