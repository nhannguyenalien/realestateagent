CREATE INDEX IF NOT EXISTS properties_published_coordinates_idx
ON properties (latitude, longitude)
WHERE status = 'published' AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180;
