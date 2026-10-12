import { db, json, type Env } from "../_shared";

import { parseNearby } from "../../../lib/nearby";
import { safeVideoUrl } from "../../../lib/property-media";
import { searchNearby } from "../_nearby";

const clean = (value: string | null, max = 160) => {
  const result = value?.trim().slice(0, max);
  if (!result || /^\{[^{}]+\}$/.test(result) || /^(null|undefined)$/i.test(result)) return null;
  return result;
};
const positiveNumber = (value: string | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

// Only http(s) video links are exposed; listings without a video get videoUrl: null.
const withVideo = <T extends Record<string, unknown>>(row: T) => ({ ...row, videoUrl: safeVideoUrl(row.videoUrl) ?? null });

function authorized(env: Env, request: Request) {
  const secret = env.SCHOOLSAI_TOOL_SECRET?.trim();
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  if (!authorized(env, request)) return json({ error: "Unauthorized" }, 401);
  return searchPublishedProperties(env, new URL(request.url));
};

// Shared by this endpoint and the MCP server (functions/mcp.ts); callers handle authorization.
export async function searchPublishedProperties(env: Env, url: URL): Promise<Response> {
  try {
    const sql = db(env);
    const id = clean(url.searchParams.get("id"), 100);
    if (id) {
      const rows = await sql`
        SELECT p.id::text, p.slug, p.title, to_jsonb(p)->>'video_url' AS "videoUrl", p.description, p.price::float8 AS price, p.currency,
               p.bedrooms, p.bathrooms, p.area_sqm::float8 AS "areaSqm", p.property_type AS "propertyType",
               p.address_line AS address, p.city, p.region, p.country_code AS "countryCode",
               COALESCE(p.primary_image_url, '/assets/figma/property-1.png') AS "imageUrl",
               ag.slug AS "agencySlug", ag.name AS "agencyName"
        FROM properties p
        LEFT JOIN agents a ON a.id = p.agent_id
        LEFT JOIN agencies ag ON ag.id = a.agency_id
        WHERE p.status = 'published' AND (p.id::text = ${id} OR p.slug = ${id})
        LIMIT 1
      `;
      if (!rows[0]) return json({ error: "Published property not found" }, 404);
      const property = withVideo(rows[0]);
      return json({ property, data: { property } });
    }

    const keyword = clean(url.searchParams.get("keyword") || url.searchParams.get("query") || url.searchParams.get("q"));
    const location = clean(url.searchParams.get("location"));
    const propertyType = clean(url.searchParams.get("property_type") || url.searchParams.get("type"), 50);
    const agencySlug = clean(url.searchParams.get("agency_slug"), 100);
    const minPrice = positiveNumber(url.searchParams.get("min_price") || url.searchParams.get("price_min") || url.searchParams.get("minPrice"));
    const maxPrice = positiveNumber(url.searchParams.get("max_price") || url.searchParams.get("price_max") || url.searchParams.get("maxPrice"));
    const minBedrooms = positiveNumber(url.searchParams.get("min_bedrooms") || url.searchParams.get("bedrooms_min") || url.searchParams.get("bedrooms"));
    const minBathrooms = positiveNumber(url.searchParams.get("min_bathrooms") || url.searchParams.get("bathrooms_min") || url.searchParams.get("bathrooms"));
    const minArea = positiveNumber(url.searchParams.get("min_area_sqm") || url.searchParams.get("area_min"));
    const maxArea = positiveNumber(url.searchParams.get("max_area_sqm") || url.searchParams.get("area_max"));
    const limit = Math.min(Math.max(Math.trunc(positiveNumber(url.searchParams.get("limit"))) || 8, 1), 20);

    let nearby;
    try {
      nearby = parseNearby(['latitude','longitude','radius_km'].some(key => url.searchParams.has(key)) ? {
        latitude: url.searchParams.get('latitude'), longitude: url.searchParams.get('longitude'),
        radiusKm: url.searchParams.get('radius_km') ?? undefined,
      } : null);
    } catch (error) { return json({error: (error as Error).message},400); }
    if (nearby) {
      const rows = await searchNearby(env, nearby, {keyword,location,propertyType,agencySlug,minPrice,maxPrice,minBedrooms,minBathrooms,minArea,maxArea,limit,currency:clean(url.searchParams.get('currency'),3)?.toUpperCase()});
      const results = rows.map(withVideo);
      return json({properties:results,count:results.length,center:nearby,distanceUnit:'km',data:{results,count:results.length}});
    }

    const rows = await sql`
      SELECT p.id::text, p.slug, p.title, to_jsonb(p)->>'video_url' AS "videoUrl", LEFT(p.description, 800) AS description,
             p.price::float8 AS price, p.currency, p.bedrooms, p.bathrooms,
             p.area_sqm::float8 AS "areaSqm", p.property_type AS "propertyType",
             p.address_line AS address, p.city, p.region, p.country_code AS "countryCode",
             COALESCE(p.primary_image_url, '/assets/figma/property-1.png') AS "imageUrl",
             ag.slug AS "agencySlug", ag.name AS "agencyName"
      FROM properties p
      LEFT JOIN agents a ON a.id = p.agent_id
      LEFT JOIN agencies ag ON ag.id = a.agency_id
      WHERE p.status = 'published'
        AND (${keyword}::text IS NULL OR
          lower(coalesce(p.title,'') || ' ' || coalesce(p.description,'') || ' ' || coalesce(p.city,'') || ' ' || coalesce(p.region,'') || ' ' || coalesce(p.address_line,''))
          LIKE '%' || lower(${keyword}) || '%')
        AND (${location}::text IS NULL OR
          lower(coalesce(p.city,'') || ' ' || coalesce(p.region,'') || ' ' || coalesce(p.address_line,''))
          LIKE '%' || lower(${location}) || '%')
        AND (${propertyType}::text IS NULL OR lower(p.property_type) = lower(${propertyType}))
        AND (${agencySlug}::text IS NULL OR ag.slug = ${agencySlug})
        AND (${minPrice}::numeric = 0 OR p.price >= ${minPrice})
        AND (${maxPrice}::numeric = 0 OR p.price <= ${maxPrice})
        AND (${minBedrooms} = 0 OR p.bedrooms >= ${minBedrooms})
        AND (${minBathrooms} = 0 OR p.bathrooms >= ${minBathrooms})
        AND (${minArea}::numeric = 0 OR p.area_sqm >= ${minArea})
        AND (${maxArea}::numeric = 0 OR p.area_sqm <= ${maxArea})
      ORDER BY p.featured_rank ASC, p.published_at DESC NULLS LAST, p.created_at DESC
      LIMIT ${limit}
    `;
    const results = rows.map(withVideo);
    return json({ properties: results, count: results.length, data: { results, count: results.length } });
  } catch (error) {
    console.error("ai.properties", error);
    return json({ error: "Unable to search properties" }, 500);
  }
}
