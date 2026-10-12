CREATE TABLE IF NOT EXISTS saved_property_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  location text,
  property_type text,
  min_price numeric(14,2),
  max_price numeric(14,2),
  min_bedrooms smallint NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  unsubscribe_token text NOT NULL UNIQUE,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (min_price IS NULL OR min_price >= 0),
  CHECK (max_price IS NULL OR max_price >= 0),
  CHECK (min_price IS NULL OR max_price IS NULL OR min_price <= max_price)
);
CREATE INDEX IF NOT EXISTS saved_property_searches_active_idx ON saved_property_searches (active, last_run_at);
CREATE INDEX IF NOT EXISTS saved_property_searches_email_idx ON saved_property_searches (lower(email));

CREATE TABLE IF NOT EXISTS external_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_id text NOT NULL,
  source_url text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  property_type text,
  price numeric(14,2),
  currency char(3) NOT NULL DEFAULT 'VND',
  bedrooms smallint NOT NULL DEFAULT 0,
  bathrooms smallint NOT NULL DEFAULT 0,
  area_sqm numeric(10,2),
  address_line text,
  city text,
  region text,
  image_url text,
  published_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (source, source_id)
);
CREATE INDEX IF NOT EXISTS external_properties_match_idx ON external_properties (active, property_type, bedrooms, price);
CREATE INDEX IF NOT EXISTS external_properties_location_idx ON external_properties (city, region);

CREATE TABLE IF NOT EXISTS saved_search_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES saved_property_searches(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  external_property_id uuid REFERENCES external_properties(id) ON DELETE CASCADE,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((property_id IS NOT NULL)::int + (external_property_id IS NOT NULL)::int = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS saved_search_internal_match_uidx ON saved_search_matches (search_id, property_id) WHERE property_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS saved_search_external_match_uidx ON saved_search_matches (search_id, external_property_id) WHERE external_property_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS property_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  items_seen integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
