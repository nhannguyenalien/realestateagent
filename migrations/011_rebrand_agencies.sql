-- Rebrand sample agencies from Estatein to Realestate Schoolsai. Slugs stay unchanged so existing links keep working.
UPDATE agencies SET name = 'Realestate Schoolsai Metro' WHERE slug = 'estatein-metro';
UPDATE agencies SET name = 'Realestate Schoolsai Coastal' WHERE slug = 'estatein-coastal';
