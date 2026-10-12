CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS properties_search_text_trgm_idx ON properties USING gin (
  (lower(coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(city,'') || ' ' || coalesce(region,'') || ' ' || coalesce(address_line,''))) gin_trgm_ops
) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS properties_published_filters_idx ON properties
  (property_type, bedrooms, bathrooms, price, area_sqm)
  WHERE status = 'published';
