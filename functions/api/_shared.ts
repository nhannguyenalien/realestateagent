import { neon } from "@neondatabase/serverless";

export type Env = {
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  ADMIN_EMAILS?: string;
  MEDIA_BUCKET?: R2Bucket;
  R2_PUBLIC_URL?: string;
  STORAGE_PROVIDER?: "r2" | "s3";
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ENDPOINT?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_PUBLIC_URL?: string;
};

export function db(env: Env) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return neon(env.DATABASE_URL);
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export function validEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function cookie(request: Request, name: string) {
  const match = request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
export function sessionToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : cookie(request, "estatein_session");
}
export async function currentUser(env: Env, request: Request) {
  const token = sessionToken(request);
  if (!token) return null;
  const sql = db(env), hash = await sha256(token);
  const rows = await sql`SELECT u.id::text,u.email,u.name,u.avatar_url AS "avatarUrl",u.role,a.id::text AS "agentId"
    FROM user_sessions s JOIN app_users u ON u.id=s.user_id LEFT JOIN agents a ON a.user_id=u.id
    WHERE s.token_hash=${hash} AND s.expires_at>NOW() LIMIT 1`;
  return rows[0] || null;
}
export async function sha256(value: string) { const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)); return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,"0")).join("") }
export function randomToken(bytes=32){const data=crypto.getRandomValues(new Uint8Array(bytes));return btoa(String.fromCharCode(...data)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
