import { db, type Env } from "./api/_shared";

const staticPaths = ["/", "/properties/", "/agents/", "/about-us/", "/services/", "/contact/", "/chat/", "/terms/", "/privacy-policy/"];
const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const origin = env.PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  let listings: { slug: string; updated: string | null }[] = [];
  try {
    listings = await db(env)`SELECT slug, to_char(COALESCE(updated_at, published_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS updated FROM properties WHERE status = 'published' ORDER BY published_at DESC NULLS LAST LIMIT 5000` as typeof listings;
  } catch (error) {
    console.error("sitemap", error);
  }
  const urls = [
    ...staticPaths.map((path) => `<url><loc>${escapeXml(origin + path)}</loc></url>`),
    ...listings.map((p) => `<url><loc>${escapeXml(`${origin}/properties/${p.slug}/`)}</loc>${p.updated ? `<lastmod>${p.updated}</lastmod>` : ""}</url>`),
  ];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
};
