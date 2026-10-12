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
  SCHOOLSAI_SYSTEM_API_KEY?: string;
  SCHOOLSAI_TOOL_SECRET?: string;
  MCP_API_KEY?: string;
  CRON_SECRET?: string;
  EXTERNAL_PROPERTY_FEEDS?: string;
  RESEND_API_KEY?: string;
  ALERT_FROM_EMAIL?: string;
  PUBLIC_SITE_URL?: string;
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
export async function currentAdmin(env:Env,request:Request){const user=await currentUser(env,request);return user?.role==="admin"?user:null}
export async function sha256(value: string) { const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)); return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,"0")).join("") }
export function randomToken(bytes=32){const data=crypto.getRandomValues(new Uint8Array(bytes));return btoa(String.fromCharCode(...data)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}

const schoolApiBase="https://apic.schoolsai.work";
export async function schoolsAiChat(apiKey:string,body:unknown){
  const response=await fetch(`${schoolApiBase}/api/v1/marketplace-chat`,{method:"POST",headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json"},body:JSON.stringify(body)});
  const data:Record<string,unknown>=await response.json<Record<string,unknown>>().catch(()=>({}));
  if(!response.ok)throw new Error(typeof data.error==="string"?data.error:`SchoolsAI returned ${response.status}`);
  return data;
}
// Cloudflare Workers WebCrypto currently caps PBKDF2 at 100,000 iterations.
const PASSWORD_ITERATIONS=100000;
const encoder=new TextEncoder();
const bytesToBase64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes));
const base64ToBytes=(value:string)=>Uint8Array.from(atob(value),char=>char.charCodeAt(0));
async function derivePassword(password:string,salt:Uint8Array,iterations:number){
  const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new Uint8Array(salt),iterations},key,256));
}
export async function hashPassword(password:string){const salt=crypto.getRandomValues(new Uint8Array(16));return{hash:bytesToBase64(await derivePassword(password,salt,PASSWORD_ITERATIONS)),salt:bytesToBase64(salt),iterations:PASSWORD_ITERATIONS}}
export async function verifyPassword(password:string,expected:string,salt:string,iterations:number){
  const actual=await derivePassword(password,base64ToBytes(salt),iterations),wanted=base64ToBytes(expected);
  if(actual.length!==wanted.length)return false;
  let mismatch=0;for(let i=0;i<actual.length;i++)mismatch|=actual[i]^wanted[i];return mismatch===0;
}
export async function createSession(env:Env,userId:string){const sql=db(env),token=randomToken(48);await sql`INSERT INTO user_sessions(user_id,token_hash,expires_at) VALUES (${userId}::uuid,${await sha256(token)},NOW()+INTERVAL '30 days')`;return token}
export function sessionCookie(token:string,request:Request){const secure=new URL(request.url).protocol==="https:"?"; Secure":"";return `estatein_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure}`}
