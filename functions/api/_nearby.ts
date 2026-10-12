import { db, type Env } from './_shared';
import type { Nearby } from '../../lib/nearby';
export type NearbyFilters = { keyword?: string | null; location?: string | null; propertyType?: string | null; agencySlug?: string | null; minPrice?: number; maxPrice?: number; minBedrooms?: number; minBathrooms?: number; minArea?: number; maxArea?: number; currency?: string | null; limit?: number };
export async function searchNearby(env: Env, center: Nearby, f: NearbyFilters = {}) {
  const sql = db(env);
  return sql`
    WITH candidates AS (
      SELECT p.id::text,p.slug,p.title,to_jsonb(p)->>'video_url' AS "videoUrl",LEFT(p.description,800) AS description,
        p.price::float8 AS price,p.currency,p.bedrooms,p.bathrooms,p.area_sqm::float8 AS "areaSqm",
        p.property_type AS "propertyType",p.address_line AS address,p.city,p.region,
        p.latitude::float8 AS latitude,p.longitude::float8 AS longitude,
        p.slug LIKE 'demo-nearby-%' AS "isDemo",
        COALESCE(p.primary_image_url,'/assets/figma/property-1.png') AS "imageUrl",
        ag.slug AS "agencySlug",ag.name AS "agencyName",
        6371.0088 * 2 * asin(sqrt(least(1.0,greatest(0.0,
          power(sin(radians(p.latitude::float8 - ${center.latitude}::float8)/2),2) +
          cos(radians(${center.latitude}::float8))*cos(radians(p.latitude::float8))*
          power(sin(radians(p.longitude::float8 - ${center.longitude}::float8)/2),2)
        )))) AS "distanceKm"
      FROM properties p LEFT JOIN agents a ON a.id=p.agent_id LEFT JOIN agencies ag ON ag.id=a.agency_id
      WHERE p.status='published' AND p.latitude BETWEEN -90 AND 90 AND p.longitude BETWEEN -180 AND 180
        AND p.latitude BETWEEN ${Math.max(-90, center.latitude-center.radiusKm/111.2-0.001)} AND ${Math.min(90, center.latitude+center.radiusKm/111.2+0.001)}
        AND (${f.keyword || null}::text IS NULL OR concat_ws(' ',p.title,p.description,p.city,p.region,p.address_line) ILIKE '%'||${f.keyword || null}||'%')
        AND (${f.location || null}::text IS NULL OR concat_ws(' ',p.city,p.region,p.address_line) ILIKE '%'||${f.location || null}||'%')
        AND (${f.propertyType || null}::text IS NULL OR lower(p.property_type)=lower(${f.propertyType || null}))
        AND (${f.agencySlug || null}::text IS NULL OR ag.slug=${f.agencySlug || null})
        AND (${f.currency || null}::text IS NULL OR p.currency=${f.currency || null})
        AND p.price>=${f.minPrice || 0} AND (${f.maxPrice || 0}::numeric=0 OR p.price<=${f.maxPrice || 0})
        AND p.bedrooms>=${f.minBedrooms || 0} AND p.bathrooms>=${f.minBathrooms || 0}
        AND (${f.minArea || 0}::numeric=0 OR p.area_sqm>=${f.minArea || 0}) AND (${f.maxArea || 0}::numeric=0 OR p.area_sqm<=${f.maxArea || 0})
    ) SELECT * FROM candidates WHERE "distanceKm"<=${center.radiusKm}
    ORDER BY "distanceKm",id LIMIT ${Math.min(20,Math.max(1,f.limit || 8))}
  `;
}
