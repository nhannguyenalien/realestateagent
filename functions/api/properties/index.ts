import {safeVideoUrl} from "../../../lib/property-media";
import { currentUser, db, ensureAgent, json, type Env } from "../_shared";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 12, 1), 24);
    const q=url.searchParams.get("q")||null, type=url.searchParams.get("type")||null;
    const bedrooms=Number(url.searchParams.get("bedrooms"))||0, minPrice=Number(url.searchParams.get("minPrice"))||0, maxPrice=Number(url.searchParams.get("maxPrice"))||0;
    const sql = db(env);
    const rows = await sql`
      SELECT id::text, slug, to_jsonb(properties)->>'video_url' AS "videoUrl", title, description, price::float8 AS price, currency,
             bedrooms, bathrooms, property_type AS "propertyType",
             COALESCE(primary_image_url, '/assets/figma/property-1.png') AS "imageUrl", city, region, address_line AS address,
             area_sqm::float8 AS "areaSqm", latitude::float8, longitude::float8
      FROM properties
      WHERE status = 'published'
        AND (${q}::text IS NULL OR CONCAT(title,' ',city,' ',region) ILIKE '%' || ${q} || '%')
        AND (${type}::text IS NULL OR property_type = ${type}) AND bedrooms >= ${bedrooms}
        AND (${minPrice}=0 OR price >= ${minPrice}) AND (${maxPrice}=0 OR price <= ${maxPrice})
      ORDER BY featured_rank ASC, published_at DESC
      LIMIT ${limit}
    `;
    return json({ properties: rows });
  } catch (error) {
    console.error("properties.list", error);
    return json({ error: "Unable to load properties" }, 500);
  }
};

type PropertyBody = Record<string, unknown>;
const textValue = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
const numberValue = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const user = await currentUser(env, request);
    if (!user) return json({ error: "Authentication required." }, 401);
    const body = await request.json<PropertyBody>();
    const title = textValue(body.title, 140), city = textValue(body.city, 80);
    const price = numberValue(body.price), area = numberValue(body.areaSqm);
    if (title.length < 8 || !city || price <= 0 || area <= 0) return json({ error: "Title, city, price and area are required" }, 400);
    const baseSlug = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const sql = db(env);
    const agentId = await ensureAgent(env, user);
    const rows = await sql`
      INSERT INTO properties (slug, title, description, price, currency, bedrooms, bathrooms,
        property_type, video_url, primary_image_url, city, region, address_line, area_sqm, latitude, longitude, status, agent_id)
      VALUES (${slug}, ${title}, ${textValue(body.description, 5000)}, ${price}, ${textValue(body.currency, 3) || "USD"},
        ${numberValue(body.bedrooms)}, ${numberValue(body.bathrooms)}, ${textValue(body.propertyType, 50) || "Apartment"},
        ${safeVideoUrl(body.videoUrl)||null}, ${textValue(body.imageUrl, 1000) || "/assets/figma/property-1.png"}, ${city}, ${textValue(body.region, 100)},
        ${textValue(body.address, 240)}, ${area}, ${numberValue(body.latitude) || null}, ${numberValue(body.longitude) || null}, 'draft', ${agentId}::uuid)
      RETURNING id::text, slug
    `;
    const amenityNames = Array.isArray(body.amenities) ? [...new Set(body.amenities.map((a) => textValue(a, 60)).filter(Boolean))].slice(0, 30) : [];
    for (const name of amenityNames) {
      const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "amenity";
      const found = await sql`INSERT INTO amenities (name, slug) VALUES (${name}, ${slug}) ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id::text`;
      await sql`INSERT INTO property_amenities (property_id, amenity_id) VALUES (${rows[0].id}::uuid, ${found[0].id}::uuid) ON CONFLICT DO NOTHING`;
    }
    return json({ ok: true, property: rows[0] }, 201);
  } catch (error) {
    console.error("properties.create", error);
    return json({ error: "Unable to create property" }, 500);
  }
};
