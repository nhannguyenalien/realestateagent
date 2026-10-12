-- Demo data for validating the shared SchoolsAI workspace with agency-scoped advice.
INSERT INTO agencies (name, slug, description, phone, email, website, address_line, city, region)
VALUES
  ('Estatein Metro', 'estatein-metro', 'Sample agency focused on metropolitan homes and investment properties.', '+84 28 7300 8866', 'hello@metro.estatein.vn', 'https://estatein.vn', 'Mai Chi Tho', 'Ho Chi Minh City', 'Thu Thiem'),
  ('Estatein Coastal', 'estatein-coastal', 'Sample agency specializing in coastal and resort properties.', '+84 236 730 4488', 'hello@coastal.estatein.vn', 'https://estatein.vn', 'Vo Nguyen Giap', 'Da Nang', 'Son Tra')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  website = EXCLUDED.website,
  address_line = EXCLUDED.address_line,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  updated_at = now();

INSERT INTO agents (name, email, phone, avatar_url, bio, agency_id)
VALUES
  ('Linh Nguyen', 'linh@estatein.vn', '+84 28 7300 8866', '/assets/figma/about/7.png', 'Senior property advisor for metropolitan homes.', (SELECT id FROM agencies WHERE slug = 'estatein-metro')),
  ('Mai Hoang', 'mai@estatein.vn', '+84 236 730 4488', '/assets/figma/about/2.png', 'Coastal and resort property specialist.', (SELECT id FROM agencies WHERE slug = 'estatein-coastal'))
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  avatar_url = EXCLUDED.avatar_url,
  bio = EXCLUDED.bio,
  agency_id = EXCLUDED.agency_id,
  updated_at = now();

UPDATE properties
SET agent_id = (SELECT id FROM agents WHERE email = 'mai@estatein.vn'), updated_at = now()
WHERE slug = 'seaside-serenity-villa';

UPDATE properties
SET agent_id = (SELECT id FROM agents WHERE email = 'linh@estatein.vn'), updated_at = now()
WHERE slug IN ('metropolitan-haven', 'rustic-retreat-cottage');
