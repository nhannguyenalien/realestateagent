import { db, json, randomToken, validEmail, type Env } from "../_shared";

type Body = { email?: unknown; name?: unknown; location?: unknown; propertyType?: unknown; minPrice?: unknown; maxPrice?: unknown; minBedrooms?: unknown };
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) || null : null;
const amount = (value: unknown) => { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : null };

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const body = await request.json<Body>();
    if (!validEmail(body.email)) return json({ error: "A valid email is required." }, 400);
    const minPrice = amount(body.minPrice), maxPrice = amount(body.maxPrice);
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) return json({ error: "Minimum price cannot exceed maximum price." }, 400);
    const minBedrooms = Math.min(20, Math.max(0, Math.trunc(Number(body.minBedrooms) || 0)));
    const sql = db(env), token = randomToken(32);
    const rows = await sql`
      INSERT INTO saved_property_searches (email,name,location,property_type,min_price,max_price,min_bedrooms,unsubscribe_token)
      VALUES (${body.email.toLowerCase()},${text(body.name,100)},${text(body.location,160)},${text(body.propertyType,80)},${minPrice},${maxPrice},${minBedrooms},${token})
      RETURNING id::text
    `;
    return json({ ok: true, id: rows[0].id, message: "Daily property alert created." }, 201);
  } catch (error) {
    console.error("saved-searches.create", error);
    return json({ error: "Unable to create the property alert." }, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const token = new URL(request.url).searchParams.get("token")?.trim();
    if (!token) return json({ error: "Missing unsubscribe token." }, 400);
    const sql = db(env);
    const rows = await sql`UPDATE saved_property_searches SET active=false,updated_at=NOW() WHERE unsubscribe_token=${token} AND active=true RETURNING id`;
    return json({ ok: true, changed: rows.length > 0 });
  } catch (error) {
    console.error("saved-searches.unsubscribe", error);
    return json({ error: "Unable to unsubscribe." }, 500);
  }
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) return new Response("Missing unsubscribe token.", { status: 400 });
  try {
    const sql = db(env);
    await sql`UPDATE saved_property_searches SET active=false,updated_at=NOW() WHERE unsubscribe_token=${token}`;
    return new Response("<!doctype html><meta charset='utf-8'><title>Realestate Schoolsai</title><body style='font:16px system-ui;max-width:620px;margin:80px auto;padding:20px'><h1>Đã dừng thông báo</h1><p>Bạn sẽ không còn nhận email từ bộ lọc bất động sản này.</p><a href='/search/'>Quay lại trang tìm kiếm</a></body>", { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  } catch (error) {
    console.error("saved-searches.unsubscribe-page", error);
    return new Response("Unable to unsubscribe.", { status: 500 });
  }
};
