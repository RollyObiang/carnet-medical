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