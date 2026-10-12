import type { Env } from "./api/_shared";
import { searchPublishedProperties } from "./api/ai/properties";
import { onRequestGet as listAgencies } from "./api/agencies/index";
import { onRequestGet as listAgents } from "./api/agents/index";

// Stateless MCP server (Streamable HTTP transport, JSON responses only). Tools are read-only.
const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const headers = { "cache-control": "no-store", "content-type": "application/json" };

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const num = (description: string, extra: Record<string, unknown> = {}) => ({ type: "number", description, ...extra });
const str = (description: string) => ({ type: "string", description });

const tools = [
  {
    name: "search_properties",
    description: "Search published real estate listings. Prices are in each listing's own currency. Pass latitude and longitude to search nearest-first within radius_km.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: str("Free text matched against title, description, city, region and address."),
        location: str("City, region or address fragment."),
        property_type: str("Property type, e.g. apartment, villa, house."),
        agency_slug: str("Restrict to one agency."),
        min_price: num("Minimum price.", { minimum: 0 }),
        max_price: num("Maximum price.", { minimum: 0 }),
        min_bedrooms: num("Minimum bedrooms.", { minimum: 0 }),
        min_bathrooms: num("Minimum bathrooms.", { minimum: 0 }),
        min_area_sqm: num("Minimum area in square metres.", { minimum: 0 }),
        max_area_sqm: num("Maximum area in square metres.", { minimum: 0 }),
        latitude: num("Search centre latitude (requires longitude).", { minimum: -90, maximum: 90 }),
        longitude: num("Search centre longitude (requires latitude).", { minimum: -180, maximum: 180 }),
        radius_km: num("Radius in km for nearby search (default 5, max 100).", { exclusiveMinimum: 0, maximum: 100 }),
        currency: str("ISO currency code filter for nearby search, e.g. VND."),
        limit: num("Maximum results (1-20, default 8).", { minimum: 1, maximum: 20 }),
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_property",
    description: "Get one published listing by its id (UUID) or slug.",
    inputSchema: { type: "object", properties: { id: str("Listing id or slug.") }, required: ["id"], additionalProperties: false },
  },
  { name: "list_agencies", description: "List agencies with agent and listing counts.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "list_agents", description: "List agents with their agency and published listing count.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
].map(tool => ({ ...tool, annotations: { readOnlyHint: true, openWorldHint: false } }));

const searchKeys = ["keyword", "location", "property_type", "agency_slug", "min_price", "max_price", "min_bedrooms", "min_bathrooms", "min_area_sqm", "max_area_sqm", "latitude", "longitude", "radius_km", "currency", "limit"];

function authorized(env: Env, request: Request) {
  const key = env.MCP_API_KEY?.trim();
  if (!key) return null;
  return request.headers.get("authorization") === `Bearer ${key}`;
}

async function callTool(env: Env, name: string, args: Record<string, unknown>): Promise<Response> {
  if (name === "search_properties") {
    const url = new URL("https://mcp.local/");
    for (const key of searchKeys) if (args[key] !== undefined && args[key] !== null) url.searchParams.set(key, String(args[key]));
    return searchPublishedProperties(env, url);
  }
  if (name === "get_property") {
    const id = typeof args.id === "string" ? args.id.trim() : "";
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    const url = new URL("https://mcp.local/");
    url.searchParams.set("id", id);
    return searchPublishedProperties(env, url);
  }
  const context = { env } as unknown as Parameters<PagesFunction<Env>>[0];
  if (name === "list_agencies") return (await listAgencies(context)) as Response;
  if (name === "list_agents") return (await listAgents(context)) as Response;
  throw new RpcError(-32602, `Unknown tool: ${name}`);
}

class RpcError extends Error {
  constructor(public code: number, message: string) { super(message); }
}

async function handle(env: Env, message: Rpc): Promise<unknown | null> {
  const isNotification = message.id === undefined;
  const respond = (result: unknown) => ({ jsonrpc: "2.0", id: message.id, result });
  try {
    if (message.jsonrpc !== "2.0" || typeof message.method !== "string") throw new RpcError(-32600, "Invalid Request");
    switch (message.method) {
      case "initialize": {
        const requested = message.params?.protocolVersion;
        return respond({
          protocolVersion: typeof requested === "string" && PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "estatein-real-estate", version: "1.0.0" },
          instructions: "Read-only access to published real estate listings, agencies and agents.",
        });
      }
      case "ping": return respond({});
      case "tools/list": return respond({ tools });
      case "tools/call": {
        const name = message.params?.name;
        if (typeof name !== "string") throw new RpcError(-32602, "Tool name is required");
        const args = (message.params?.arguments ?? {}) as Record<string, unknown>;
        const response = await callTool(env, name, args);
        const text = await response.text();
        return respond({ content: [{ type: "text", text }], isError: !response.ok });
      }
      default:
        if (message.method.startsWith("notifications/")) return null;
        throw new RpcError(-32601, `Method not found: ${message.method}`);
    }
  } catch (error) {
    if (isNotification) return null;
    if (error instanceof RpcError) return { jsonrpc: "2.0", id: message.id ?? null, error: { code: error.code, message: error.message } };
    console.error("mcp", error);
    return { jsonrpc: "2.0", id: message.id ?? null, error: { code: -32603, message: "Internal error" } };
  }
}

export const onRequest: PagesFunction<Env> = async ({ env, request }) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
  const auth = authorized(env, request);
  if (auth === null) return Response.json({ error: "MCP server is not configured." }, { status: 503, headers });
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401, headers: { ...headers, "www-authenticate": "Bearer" } });

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers });
  }
  if (Array.isArray(body)) {
    if (!body.length || body.length > 20) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } }, { status: 400, headers });
    const results = (await Promise.all(body.map(item => handle(env, item as Rpc)))).filter(Boolean);
    return results.length ? new Response(JSON.stringify(results), { headers }) : new Response(null, { status: 202 });
  }
  const result = await handle(env, (body ?? {}) as Rpc);
  return result ? new Response(JSON.stringify(result), { headers }) : new Response(null, { status: 202 });
};
