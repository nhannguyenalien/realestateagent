# Estatein

Figma-inspired real-estate landing page built with a statically exported Next.js frontend, Cloudflare Pages Functions API, and Neon Postgres.

## Local development

```bash
npm install
npm run dev
```

The normal Next.js dev server uses built-in fallback property data. To run the Pages Functions too:

```bash
npm run build
npx wrangler pages dev out --binding DATABASE_URL="postgresql://..."
```

## Database

Create a Neon project/database, then run `db/schema.sql`, every file in `migrations/` in numeric order, and finally `db/seed.sql` in the Neon SQL editor. Add the pooled connection string as a Cloudflare Pages secret named `DATABASE_URL`.

## Daily property alerts

Migration `007_saved_property_searches.sql` adds saved customer searches, normalized external listings, match history, and sync-run logs. Customers can save the filters on `/search/`; the daily endpoint syncs approved feeds, finds only previously unseen matches, and optionally sends them through Resend.

Set these Cloudflare Pages secrets/variables:

```text
CRON_SECRET=<long-random-value>
PUBLIC_SITE_URL=https://your-domain.example
EXTERNAL_PROPERTY_FEEDS=[{"name":"partner","url":"https://partner.example/feed.json","token":"optional"}]
RESEND_API_KEY=<optional>
ALERT_FROM_EMAIL=Estatein <alerts@your-domain.example>
```

External feeds may return either a JSON array or `{ "items": [...] }`. Each item supports `id`, `url`, `title`, `description`, `propertyType`, `price`, `currency`, `bedrooms`, `bathrooms`, `areaSqm`, `address`, `city`, `region`, `imageUrl`, and ISO `publishedAt`. Only configure sources whose API/feed or crawl terms permit this use.

Deploy the scheduler after replacing `DAILY_SEARCH_URL` in `wrangler.cron.jsonc`:

```bash
npx wrangler secret put CRON_SECRET --config wrangler.cron.jsonc
npm run cron:deploy
```

The schedule is `0 1 * * *` (01:00 UTC / 08:00 Vietnam time). The same `CRON_SECRET` value must be configured for both Pages and the cron Worker.

**Current setup (Coolify instead of Cloudflare cron).** The Cloudflare Free plan allows only 5 cron triggers per account and this account is at the limit, so the schedule runs on the Coolify VPS instead: service `estatein-daily-search` (project `estatein-cron`) built from `deploy/coolify-daily-search.compose.yml`. It is an Alpine container whose `crond` calls `POST /api/cron/daily-property-search/` at 01:00 UTC with `Authorization: Bearer $CRON_SECRET`. `CRON_SECRET` is a Coolify environment variable and must equal the Pages secret. Check it with `GET /api/v1/services/<uuid>/logs?sub_service_name=cron` on the Coolify API. The Worker files (`workers/`, `wrangler.cron.jsonc`) stay for use on a Workers Paid plan.

## Deploy

Connect the repository to Cloudflare Pages and use `npm run build` as the build command with `out` as the output directory. The `functions` directory is deployed as Pages Functions automatically.

### Nearby AI property search

Apply `migrations/008_nearby_search.sql`. In the advisor, select **Use my location** / **Dùng vị trí của tôi**, allow browser location access, select a radius, then ask for properties. Location stays in component memory and is sent with the chat request; Clear disables the filter. Browser geolocation requires HTTPS or localhost. A radius written in the latest message (e.g. `5 km`) overrides the selector for that request. Supported radii are greater than zero and at most 100 km.

The authenticated `GET /api/ai/properties/` tool accepts `latitude`, `longitude`, `radius_km` (default 5), and optional `currency=VND` alongside existing filters. Supply both coordinates. Responses include `distanceKm` (straight-line distance) and `isDemo`; only published listings with valid coordinates are eligible, ordered nearest first. Invalid location parameters return HTTP 400. Chat requests accept `location: {latitude, longitude, radiusKm}`. Nearby requests without location ask the user to share it. Agency scope remains enforced.

For an empty or ungeocoded database, optionally run `db/demo-nearby.sql`. It adds six explicitly fictional `[DEMO]` listings (four in HCMC, one in Hanoi, one in Da Nang), without changing existing listings. Around `10.7769,106.7009`, a 5 km search for apartments under 3 billion VND returns two demo listings. Missing coordinates are no longer replaced by invented map markers.

Run `node tests/nearby.test.mjs` with `.dev.vars` and these demo fixtures to check actual database queries and API behavior. The integration test mocks the SchoolsAI reply while checking the exact search context sent to it. Run `npm run typecheck` and `npm run build` for frontend validation.

### Property cards in AI chat

Chat responses include structured `properties` from the same database result set supplied to the AI. Cards show the listing image, native currency price and straight-line distance when available. Details open the shared search quick-view modal and load the full listing (gallery, amenities and agent); the modal links to the listing page. Videos use the optional `video_url` field and are never inferred by the model. Apply `migrations/009_property_video.sql` before accepting new listing submissions; the existing video URL field on the listing form now persists to this column. Listings without a video have no video button.

Validation: `npm run typecheck`, `npm run build`, `node tests/nearby.test.mjs` (requires `.dev.vars` and nearby demo fixtures; external AI response is mocked).

### AI chat history

`/chat/` provides a full-page workspace with searchable conversations, filtering by AI agent, and resumable history including property cards. The floating advisor opens a full-height drawer and links to the current conversation in this workspace.

Apply `migrations/010_chat_history.sql` before deploying. Signed-in conversations are stored in `ai_conversations`, scoped to the authenticated user. Guests retain up to 100 conversations in this browser's local storage; guest conversations are not automatically merged into accounts. Account history loads the 100 most recently updated conversations. Location permission must be granted again when resuming a conversation; coordinates are not stored in chat history.

Checks: `node tests/chat-history.test.mjs` uses `.dev.vars` and temporary users in the configured database; `tests/chat-history.browser.cjs` covers guest history and responsive navigation with mocked AI responses.

### API reference and MCP server

- **OpenAPI:** `public/openapi.json` (OpenAPI 3.1) is served at `/openapi.json`; the interactive Swagger UI is at `/api-docs/`. The spec is generated by `scripts/generate-openapi.mjs` (`npm run openapi`); edit the script, not the JSON.
- **MCP:** `functions/mcp.ts` serves a stateless, read-only [Model Context Protocol](https://modelcontextprotocol.io) server at `POST /mcp` (Streamable HTTP, JSON responses). Tools: `search_properties` (filters plus nearby search via `latitude`/`longitude`/`radius_km`), `get_property`, `list_agencies`, `list_agents`. It reuses the search logic of `/api/ai/properties/`.
- Set the secret `MCP_API_KEY`; clients send `Authorization: Bearer <MCP_API_KEY>`. While it is blank the endpoint returns 503.

```bash
claude mcp add --transport http estatein https://your-domain.example/mcp --header "Authorization: Bearer $MCP_API_KEY"
```

Check: `node tests/mcp.test.mjs` (protocol and auth only; the logged "DATABASE_URL is not configured" error is expected because the tool-call cases run without a database).
