import { db, type Env } from "../api/_shared";
import { propertyDescription, propertyTitle } from "../../lib/property-seo";
import type { Property } from "../../types/property";

// Listings created after the build have no pre-rendered page, so every listing is served from one pre-rendered shell and the
// client component loads it by URL slug. This function replaces the shell's <title> and meta tags with the listing's own,
// so crawlers and link previews see real metadata without running JavaScript.
const SHELL_PATH = "/properties/demo-nearby-hcm-1/";

export const onRequestGet: PagesFunction<Env & { ASSETS: Fetcher }> = async ({ env, request, params }) => {
  const slug = String(params.slug || "");
  const origin = new URL(request.url).origin;
  const asset = (path: string) => env.ASSETS.fetch(new Request(origin + path, { headers: request.headers }));

  let listing: Property | null = null;
  try {
    const rows = await db(env)`SELECT slug, title, description, price::float8 AS price, currency, bedrooms, bathrooms, area_sqm::float8 AS "areaSqm",
      address_line AS address, city, region, COALESCE(primary_image_url, '/assets/figma/property-1.png') AS "imageUrl"
      FROM properties WHERE slug = ${slug} AND status = 'published' LIMIT 1`;
    listing = (rows[0] as unknown as Property) || null;
  } catch (error) {
    console.error("property.meta", error);
  }

  if (!listing) {
    const own = await asset(`/properties/${encodeURIComponent(slug)}/`);
    if (own.ok) return own;
    return asset("/404.html").then((r) => new Response(r.body, { status: 404, headers: r.headers }));
  }

  const shell = await asset(SHELL_PATH);
  if (!shell.ok) return shell;
  const title = propertyTitle(listing), description = propertyDescription(listing);
  const image = listing.imageUrl ? new URL(listing.imageUrl, origin).href : "";
  const canonical = `${origin}/properties/${listing.slug}/`;
  const og = (property: string, content: string) => `<meta property="${property}" content="${content.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}">`;
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  return new HTMLRewriter()
    .on("title", { element(el) { el.setInnerContent(esc(title), { html: true }); } })
    .on('meta[name="description"]', { element(el) { el.remove(); } })
    .on('meta[property^="og:"]', { element(el) { el.remove(); } })
    .on('link[rel="canonical"]', { element(el) { el.remove(); } })
    .on("head", {
      element(el) {
        el.append(
          `<meta name="description" content="${description.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}">` +
          og("og:title", title) + og("og:description", description) + og("og:type", "website") + og("og:url", canonical) + (image ? og("og:image", image) : "") +
          `<link rel="canonical" href="${canonical}">`,
          { html: true },
        );
      },
    })
    .transform(new Response(shell.body, { status: 200, headers: shell.headers }));
};
