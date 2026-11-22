CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un email ne peut exister qu'une fois, sans tenir compte des majuscules
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS patients (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  first_name              TEXT NOT NULL,
  last_name               TEXT NOT NULL,
  birth_date              DATE,
  sex                     TEXT CHECK (sex IN ('F', 'M', 'autre')),
  blood_group             TEXT CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  phone                   TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type              TEXT NOT NULL DEFAULT 'autre'
                    CHECK (type IN ('analyse','ordonnance','imagerie','compte_rendu','vaccination','autre')),
  title             TEXT NOT NULL,
  document_date     DATE,
  storage_key       TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  size_bytes        BIGINT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS documents_patient_idx
  ON documents (patient_id, document_date DESC);

  CREATE TABLE IF NOT EXISTS emergency_info (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  allergies           TEXT[] NOT NULL DEFAULT '{}',
  current_medications TEXT[] NOT NULL DEFAULT '{}',
  vital_notes         TEXT,
  is_public           BOOLEAN NOT NULL DEFAULT false,
  public_token        TEXT UNIQUE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens (user_id);

CREATE TABLE IF NOT EXISTS establishments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL
                CHECK (type IN ('hopital','clinique','centre_sante','cabinet','pharmacie','laboratoire')),
  city          TEXT NOT NULL,
  address       TEXT,
  phone         TEXT,
  opening_hours TEXT,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS specialties (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS practitioners (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  specialty_id     UUID NOT NULL REFERENCES specialties(id),
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS practitioners_establishment_idx ON practitioners (establishment_id);
CREATE INDEX IF NOT EXISTS establishments_city_idx ON establishments (city);

CREATE TABLE IF NOT EXISTS availabilities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  weekday         SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 7), -- 1 = lundi, 7 = dimanche
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  slot_minutes    SMALLINT NOT NULL DEFAULT 30 CHECK (slot_minutes BETWEEN 10 AND 120),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS availabilities_practitioner_idx ON availabilities (practitioner_id, weekday);

CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at    TIMESTAMPTZ
);

-- Un médecin ne peut avoir qu'un rendez-vous confirmé par créneau
CREATE UNIQUE INDEX IF NOT EXISTS appointments_practitioner_slot_unique
  ON appointments (practitioner_id, starts_at) WHERE status = 'confirmed';

-- Un patient ne peut pas être à deux endroits à la même heure
CREATE UNIQUE INDEX IF NOT EXISTS appointments_patient_slot_unique
  ON appointments (patient_id, starts_at) WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS appointments_patient_idx ON appointments (patient_id, starts_at DESC);