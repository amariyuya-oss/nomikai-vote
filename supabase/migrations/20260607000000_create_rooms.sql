CREATE TABLE rooms (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  event_at          TIMESTAMPTZ NOT NULL,
  location          TEXT,
  nearest_station   TEXT,
  participant_token UUID        NOT NULL UNIQUE,
  admin_token       UUID        NOT NULL UNIQUE,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can read rooms"
  ON rooms FOR SELECT TO anon
  USING (true);
