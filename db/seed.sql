INSERT INTO properties (slug, title, description, property_type, status, price, currency, bedrooms, bathrooms, primary_image_url, featured, featured_rank, published_at)
VALUES
  ('seaside-serenity-villa', 'Seaside Serenity Villa', 'A stunning 4-bedroom, 3-bathroom villa in a peaceful suburban neighborhood...', 'Villa', 'published', 550000, 'USD', 4, 3, '/assets/figma/property-1.png', true, 1, now()),
  ('metropolitan-haven', 'Metropolitan Haven', 'A chic and fully-furnished 2-bedroom apartment with panoramic city views...', 'Villa', 'published', 550000, 'USD', 2, 2, '/assets/figma/property-2.png', true, 2, now()),
  ('rustic-retreat-cottage', 'Rustic Retreat Cottage', 'An elegant 3-bedroom, 2.5-bathroom townhouse in a gated community...', 'Villa', 'published', 550000, 'USD', 3, 3, '/assets/figma/property-3.png', true, 3, now())
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, price = EXCLUDED.price,
  primary_image_url = EXCLUDED.primary_image_url, featured = EXCLUDED.featured, featured_rank = EXCLUDED.featured_rank;
