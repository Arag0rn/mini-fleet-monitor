-- Demo user admin@test.com / test123 (bcrypt, cost 10)
INSERT INTO users (email, password_hash)
VALUES ('admin@test.com', '$2b$10$TWrRDWgKOMmAFZUMjEMjrujU8PWVXfPjLP4JWT8Vr2obnzt/15lYC');

-- Robots within ~400 m of Mühlweg 44, Leipzig (51.339374, 12.470607)
INSERT INTO robots (name, status, lat, lon) VALUES
  ('Patrol-01', 'idle',   51.339799, 12.472805),
  ('Patrol-02', 'moving', 51.342007, 12.472830),
  ('Patrol-03', 'moving', 51.341335, 12.469636),
  ('Patrol-04', 'idle',   51.341050, 12.465519),
  ('Patrol-05', 'moving', 51.338585, 12.466525),
  ('Patrol-06', 'moving', 51.337830, 12.469303),
  ('Patrol-07', 'idle',   51.336235, 12.472161),
  ('Patrol-08', 'moving', 51.338272, 12.473950);

INSERT INTO robot_positions (robot_id, lat, lon)
SELECT id, lat, lon FROM robots;
