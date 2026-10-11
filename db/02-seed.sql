-- Demo user admin@test.com / test123 (bcrypt, cost 10)
INSERT INTO users (email, password_hash)
VALUES ('admin@test.com', '$2b$10$TWrRDWgKOMmAFZUMjEMjrujU8PWVXfPjLP4JWT8Vr2obnzt/15lYC');

-- Robots on the patrol network (paths and roads) within ~450 m of Mühlweg 44, Leipzig (51.339374, 12.470607)
INSERT INTO robots (name, status, lat, lon) VALUES
  ('Patrol-01', 'idle',   51.339697, 12.472067),
  ('Patrol-02', 'moving', 51.341407, 12.473854),
  ('Patrol-03', 'moving', 51.341247, 12.469425),
  ('Patrol-04', 'idle',   51.341374, 12.465767),
  ('Patrol-05', 'moving', 51.338519, 12.466321),
  ('Patrol-06', 'moving', 51.337920, 12.469090),
  ('Patrol-07', 'idle',   51.336132, 12.472252),
  ('Patrol-08', 'moving', 51.338128, 12.474038);

INSERT INTO robot_positions (robot_id, lat, lon)
SELECT id, lat, lon FROM robots;
