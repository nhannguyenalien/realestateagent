import { db, json, type Env } from "../_shared";

type CronEnv = Env & { CRON_SECRET?: string; EXTERNAL_PROPERTY_FEEDS?: string; RESEND_API_KEY?: string; ALERT_FROM_EMAIL?: string; PUBLIC_SITE_URL?: string };
type FeedConfig = { name: string; url: string; token?: string };
type FeedItem = { id?: unknown; url?: unknown; title?: unknown; description?: unknown; propertyType?: unknown; price?: unknown; currency?: unknown; bedrooms?: unknown; bathrooms?: unknown; areaSqm?: unknown; address?: unknown; city?: unknown; region?: unknown; imageUrl?: unknown; publishedAt?: unknown };
const string = (value: unknown, max=500) => typeof value === "string" ? value.trim().slice(0,max) : "";
const number = (value: unknown) => { const n=Number(value); return Number.isFinite(n)&&n>=0?n:null };
const escapeHtml = (value: unknown) => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));

async function syncFeeds(env:CronEnv) {
  const sql=db(env); let feeds:FeedConfig[]=[];
  try { feeds=JSON.parse(env.EXTERNAL_PROPERTY_FEEDS||"[]") as FeedConfig[] } catch { throw new Error("EXTERNAL_PROPERTY_FEEDS must be valid JSON") }
  const summary:{source:string;seen:number;error?:string}[]=[];
  for(const feed of feeds){
    if(!feed?.name||!feed?.url||!/^https:\/\//.test(feed.url))continue;
    const run=await sql`INSERT INTO property_sync_runs(source,status) VALUES(${feed.name},'running') RETURNING id::text`;
    try{
      const response=await fetch(feed.url,{headers:{accept:"application/json",...(feed.token?{authorization:`Bearer ${feed.token}`}:{})}});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const payload=await response.json<{items?:FeedItem[]} | FeedItem[]>(); const items=Array.isArray(payload)?payload:payload.items||[];
      for(const item of items.slice(0,1000)){
        const sourceUrl=string(item.url,2000),title=string(item.title,300),sourceId=string(item.id,300)||sourceUrl;
        if(!sourceUrl||!title||!sourceId)continue;
        await sql`INSERT INTO external_properties(source,source_id,source_url,title,description,property_type,price,currency,bedrooms,bathrooms,area_sqm,address_line,city,region,image_url,published_at,last_seen_at,active)
          VALUES(${feed.name},${sourceId},${sourceUrl},${title},${string(item.description,5000)},${string(item.propertyType,80)||null},${number(item.price)},${(string(item.currency,3)||"VND").toUpperCase()},${number(item.bedrooms)||0},${number(item.bathrooms)||0},${number(item.areaSqm)},${string(item.address,500)||null},${string(item.city,120)||null},${string(item.region,120)||null},${string(item.imageUrl,2000)||null},${string(item.publishedAt,80)||null}::timestamptz,NOW(),true)
          ON CONFLICT(source,source_id) DO UPDATE SET source_url=EXCLUDED.source_url,title=EXCLUDED.title,description=EXCLUDED.description,property_type=EXCLUDED.property_type,price=EXCLUDED.price,currency=EXCLUDED.currency,bedrooms=EXCLUDED.bedrooms,bathrooms=EXCLUDED.bathrooms,area_sqm=EXCLUDED.area_sqm,address_line=EXCLUDED.address_line,city=EXCLUDED.city,region=EXCLUDED.region,image_url=EXCLUDED.image_url,published_at=EXCLUDED.published_at,last_seen_at=NOW(),active=true`;
      }
      await sql`UPDATE property_sync_runs SET status='success',items_seen=${items.length},finished_at=NOW() WHERE id=${run[0].id}::uuid`;summary.push({source:feed.name,seen:items.length});
    }catch(error){const message=error instanceof Error?error.message:"Unknown sync error";await sql`UPDATE property_sync_runs SET status='failed',error=${message},finished_at=NOW() WHERE id=${run[0].id}::uuid`;summary.push({source:feed.name,seen:0,error:message})}
  }
  return summary;
}

async function sendEmail(env:CronEnv,to:string,name:string|null,items:Record<string,unknown>[],token:string){
  if(!env.RESEND_API_KEY||!env.ALERT_FROM_EMAIL)return false;
  const site=(env.PUBLIC_SITE_URL||"").replace(/\/$/,"");
  const cards=items.map(item=>`<li style="margin:0 0 14px"><a href="${escapeHtml(item.url)}"><strong>${escapeHtml(item.title)}</strong></a><br>${escapeHtml(item.location)} · ${escapeHtml(item.price)} ${escapeHtml(item.currency)} · ${escapeHtml(item.bedrooms)} PN <small>(${escapeHtml(item.source)})</small></li>`).join("");
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({from:env.ALERT_FROM_EMAIL,to:[to],subject:`${items.length} bất động sản mới phù hợp với bạn`,html:`<h2>Chào ${escapeHtml(name||"bạn")},</h2><p>Realestate Schoolsai tìm thấy các BĐS mới phù hợp:</p><ul>${cards}</ul><p><a href="${site}/api/saved-searches/?token=${encodeURIComponent(token)}">Ngừng nhận thông báo</a></p>`})});
  if(!response.ok)throw new Error(`Resend HTTP ${response.status}`); return true;
}

export const onRequestPost:PagesFunction<CronEnv>=async({env,request})=>{
  if(!env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${env.CRON_SECRET}`)return json({error:"Unauthorized"},401);
  try{
    const feeds=await syncFeeds(env),sql=db(env);
    const searches=await sql`SELECT id::text,email,name,location,property_type AS "propertyType",min_price::float8 AS "minPrice",max_price::float8 AS "maxPrice",min_bedrooms AS "minBedrooms",unsubscribe_token AS token,last_run_at AS "lastRunAt" FROM saved_property_searches WHERE active=true ORDER BY created_at LIMIT 1000`;
    let matched=0,emailed=0;
    for(const search of searches){
      const location=search.location as string|null,type=search.propertyType as string|null,min=Number(search.minPrice)||0,max=Number(search.maxPrice)||0,beds=Number(search.minBedrooms)||0;
      const rows=await sql`
        WITH candidates AS (
          SELECT p.id,NULL::uuid AS external_id,p.title,p.price::float8 AS price,p.currency,p.bedrooms,concat_ws(', ',p.city,p.region) AS location,${(env.PUBLIC_SITE_URL||"").replace(/\/$/,"")}||'/properties/'||p.slug||'/' AS url,'Realestate Schoolsai' AS source,p.created_at AS seen_at
          FROM properties p WHERE p.status='published'
            AND (${location}::text IS NULL OR lower(concat_ws(' ',p.address_line,p.city,p.region)) LIKE '%'||lower(${location})||'%')
            AND (${type}::text IS NULL OR lower(p.property_type)=lower(${type})) AND (${min}=0 OR p.price>=${min}) AND (${max}=0 OR p.price<=${max}) AND p.bedrooms>=${beds}
          UNION ALL
          SELECT NULL::uuid,e.id,e.title,e.price::float8,e.currency,e.bedrooms,concat_ws(', ',e.city,e.region),e.source_url,e.source,e.first_seen_at
          FROM external_properties e WHERE e.active=true
            AND (${location}::text IS NULL OR lower(concat_ws(' ',e.address_line,e.city,e.region)) LIKE '%'||lower(${location})||'%')
            AND (${type}::text IS NULL OR lower(e.property_type)=lower(${type})) AND (${min}=0 OR e.price>=${min}) AND (${max}=0 OR e.price<=${max}) AND e.bedrooms>=${beds}
        ), fresh AS (
          SELECT c.* FROM candidates c WHERE NOT EXISTS (SELECT 1 FROM saved_search_matches m WHERE m.search_id=${search.id}::uuid AND (m.property_id=c.id OR m.external_property_id=c.external_id)) ORDER BY seen_at DESC LIMIT 20
        ) SELECT * FROM fresh`;
      for(const row of rows)await sql`INSERT INTO saved_search_matches(search_id,property_id,external_property_id) VALUES(${search.id}::uuid,${row.id}::uuid,${row.external_id}::uuid) ON CONFLICT DO NOTHING`;
      if(rows.length){matched+=rows.length;try{if(await sendEmail(env,String(search.email),search.name as string|null,rows as Record<string,unknown>[],String(search.token))){emailed++;await sql`UPDATE saved_search_matches SET notified_at=NOW() WHERE search_id=${search.id}::uuid AND notified_at IS NULL`}}catch(error){console.error("saved-search.email",search.id,error)}}
      await sql`UPDATE saved_property_searches SET last_run_at=NOW(),updated_at=NOW() WHERE id=${search.id}::uuid`;
    }
    return json({ok:true,feeds,searches:searches.length,matched,emailed,ranAt:new Date().toISOString()});
  }catch(error){console.error("cron.daily-property-search",error);return json({error:"Daily property search failed"},500)}
};
