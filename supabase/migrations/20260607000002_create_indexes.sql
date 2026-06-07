CREATE INDEX idx_rooms_expires_at
  ON rooms(expires_at);

CREATE INDEX idx_votes_return_time_room_id
  ON votes_return_time(room_id);

CREATE INDEX idx_votes_afterparty_room_id
  ON votes_afterparty(room_id);
