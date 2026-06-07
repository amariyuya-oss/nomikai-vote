CREATE TABLE votes_return_time (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  choice     TEXT        NOT NULL CHECK (
               choice IN ('21:00', '21:30', '22:00', '22:30', '23:00', '終電まで', '未定')
             ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE votes_afterparty (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  choice     TEXT        NOT NULL CHECK (choice IN ('行く', '行かない', '未定')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE votes_return_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes_afterparty  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can read votes_return_time"
  ON votes_return_time FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon can insert votes_return_time"
  ON votes_return_time FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_id
        AND rooms.expires_at > NOW()
    )
  );

CREATE POLICY "anon can read votes_afterparty"
  ON votes_afterparty FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon can insert votes_afterparty"
  ON votes_afterparty FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_id
        AND rooms.expires_at > NOW()
    )
  );
