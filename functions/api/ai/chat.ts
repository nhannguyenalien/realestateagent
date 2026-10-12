import {cleanAdvisorText} from "../../../lib/chat-text";
import {safeVideoUrl} from "../../../lib/property-media";
import { parseNearby, wantsNearby, radiusFromText } from "../../../lib/nearby";
import { searchNearby } from "../_nearby";
import {db,json,schoolsAiChat,type Env} from "../_shared";

type Message={role:"user"|"assistant";content:string};
type Language="en"|"ja"|"fr"|"es"|"vi";
type ChatBody={location?:unknown;scope?:"system"|"agency";session?:string;messages?:Message[];propertySlug?:string;language?:Language};
const languageNames:Record<Language,string>={en:"English",ja:"Japanese",fr:"French",es:"Spanish",vi:"Vietnamese"};
const cleanMessages=(messages:Message[]|undefined)=>(messages||[]).filter(m=>(m.role==="user"||m.role==="assistant")&&typeof m.content==="string").slice(-20).map(m=>({role:m.role,content:m.content.trim().slice(0,4000)})).filter(m=>m.content);
const numberValue=(raw:string,unit="")=>{const compact=raw.replace(/\s/g,"");let value:Number=Number(compact.replace(/(?<=\d)[.,](?=\d{3}(?:\D|$))/g,"").replace(",","."));if(!Number.isFinite(value as number))return 0;const u=unit.toLowerCase();if(/^(tỷ|ty|b|billion)$/.test(u))value=(value as number)*1_000_000_000;else if(/^(triệu|trieu|tr|m|million)$/.test(u))value=(value as number)*1_000_000;else if(/^(k|nghìn|nghin|thousand)$/.test(u))value=(value as number)*1_000;return value as number};
function searchIntent(text:string){
  const normalized=text.normalize("NFC"),lower=normalized.toLowerCase();
  const amount="([0-9]+(?:[.,][0-9]+)*)\\s*(tỷ|ty|triệu|trieu|tr|k|m|b|million|billion|usd|vnd|đ|đồng|dong)?";
  const max=lower.match(new RegExp(`(?:dưới|duoi|tối đa|toi da|không quá|khong qua|up to|under|at most)\\s*${amount}`));
  const min=lower.match(new RegExp(`(?:trên|tren|tối thiểu|toi thieu|ít nhất|it nhat|from|over|at least)\\s*${amount}`));
  const beds=lower.match(/(?:ít nhất\s*)?(\d+)\s*(?:phòng ngủ|phong ngu|bedrooms?|pn)\b/);
  const baths=lower.match(/(?:ít nhất\s*)?(\d+)\s*(?:phòng tắm|phong tam|bathrooms?|wc)\b/);
  const keyword=normalized.match(/(?:từ khóa|tu khoa|keyword)\s*["“”']?([^"“”'.,;!?]+)/i)?.[1]?.trim()||null;
  const types=["villa","penthouse","cottage","apartment","căn hộ","can ho","nhà phố","nha pho","đất","dat"];
  const foundType=types.find(type=>lower.includes(type))||null;
  const propertyType=foundType ? ({"căn hộ":"apartment","can ho":"apartment","nhà phố":"house","nha pho":"house","đất":"land","dat":"land"}[foundType]||foundType) : null;
  return {keyword,propertyType,minPrice:min?numberValue(min[1],min[2]):0,maxPrice:max?numberValue(max[1],max[2]):0,minBedrooms:beds?Number(beds[1]):0,minBathrooms:baths?Number(baths[1]):0};
}

export const onRequestPost:PagesFunction<Env>=async({env,request})=>{try{
  const body=await request.json<ChatBody>(),messages=cleanMessages(body.messages);
  if(!messages.length||messages.at(-1)?.role!=="user")return json({error:"A user message is required."},400);
  const latest=messages.at(-1)!.content;
  let nearby;
  try {
    nearby=parseNearby(body.location);
    const radius=radiusFromText(latest);
    if(nearby && radius!==undefined)nearby=parseNearby({...nearby,radiusKm:radius});
  } catch(error){return json({error:(error as Error).message},400)}
  if(wantsNearby(latest)&&!nearby)return json({requiresLocation:true,reply:body.language==='vi'?'Bạn hãy bấm “Dùng vị trí của tôi” để tìm nhà quanh đây. Chưa có vị trí nên tôi chưa thể xác định khoảng cách.':'Please use the location button to search nearby. Your position is needed to calculate distances.'});
  const sql=db(env),scope=body.scope==="agency"?"agency":"system",language:Language=body.language&&body.language in languageNames?body.language:"en";
  const apiKey=env.SCHOOLSAI_SYSTEM_API_KEY||"";
  let focusedProperty:Record<string,unknown>|undefined,agencySlug="";
  if(scope==="agency"&&!body.propertySlug)return json({error:"Agency advice requires a published property context."},400);
  if(body.propertySlug){
    const rows=await sql`SELECT p.id::text,p.slug,p.title,COALESCE(p.primary_image_url,'/assets/figma/property-1.png') AS "imageUrl",to_jsonb(p)->>'video_url' AS "videoUrl",LEFT(p.description,1000) AS description,p.price::float8 AS price,p.currency,p.bedrooms,p.bathrooms,p.area_sqm::float8 AS "areaSqm",p.property_type AS "propertyType",p.address_line AS address,p.city,p.region,ag.slug AS "agencySlug",ag.name AS "agencyName" FROM properties p LEFT JOIN agents a ON a.id=p.agent_id LEFT JOIN agencies ag ON ag.id=a.agency_id WHERE p.slug=${body.propertySlug} AND p.status='published' LIMIT 1`;
    const property=rows[0];if(!property)return json({error:"Published property not found."},404);focusedProperty=property;agencySlug=String(property.agencySlug||"");
  }
  if(scope==="agency"&&!agencySlug)return json({error:"This property is not connected to an agency."},409);
  const scopeInstruction="Only advise from the supplied published property data. Copy titles and numbers exactly, never invent or rename a listing, explicitly identify [DEMO] listings as fictional, and say when data is unavailable.";
  let properties:Record<string,unknown>[]=focusedProperty?[focusedProperty]:[];
  let itemContext=focusedProperty?JSON.stringify({advisorScope:scope,agencySlug:scope==="agency"?agencySlug:null,language,instructions:`${scopeInstruction} Always answer in ${languageNames[language]}, matching the website language selected by the user.`,focusedProperty}):undefined;
  if(nearby){
    const intent=searchIntent(latest);
    const currency=/tỷ|ty\b|triệu|trieu|vnd|đồng/i.test(latest)?"VND":/usd|\$/i.test(latest)?"USD":null;
    const rows=await searchNearby(env,nearby,{...intent,currency,agencySlug:scope==="agency"?agencySlug:null});
    properties=rows;
    itemContext=JSON.stringify({advisorScope:scope,language,searchCriteria:{...intent,...nearby,currency},searchResults:rows,instructions:`Only recommend searchResults. If empty, say no matching property within this radius; never substitute distant properties. Distances are straight-line kilometers, not driving distances. Listings with isDemo=true are fictional demo data: explicitly label them DEMO, never imply actual availability. Copy listing facts exactly. Answer in ${languageNames[language]}.`});
  }else if(!focusedProperty){
    const intent=searchIntent(messages.at(-1)?.content||"");
    const rows=await sql`SELECT p.id::text,p.slug,p.title,COALESCE(p.primary_image_url,'/assets/figma/property-1.png') AS "imageUrl",to_jsonb(p)->>'video_url' AS "videoUrl",LEFT(p.description,800) AS description,p.price::float8 AS price,p.currency,p.bedrooms,p.bathrooms,p.area_sqm::float8 AS "areaSqm",p.property_type AS "propertyType",p.address_line AS address,p.city,p.region,ag.slug AS "agencySlug",ag.name AS "agencyName" FROM properties p LEFT JOIN agents a ON a.id=p.agent_id LEFT JOIN agencies ag ON ag.id=a.agency_id WHERE p.status='published' AND (${intent.keyword}::text IS NULL OR lower(coalesce(p.title,'')||' '||coalesce(p.description,'')) LIKE '%'||lower(${intent.keyword})||'%') AND (${intent.propertyType}::text IS NULL OR lower(p.property_type) LIKE '%'||lower(${intent.propertyType})||'%') AND (${intent.minPrice}::numeric=0 OR p.price>=${intent.minPrice}) AND (${intent.maxPrice}::numeric=0 OR p.price<=${intent.maxPrice}) AND (${intent.minBedrooms}=0 OR p.bedrooms>=${intent.minBedrooms}) AND (${intent.minBathrooms}=0 OR p.bathrooms>=${intent.minBathrooms}) ORDER BY p.featured_rank ASC,p.published_at DESC NULLS LAST,p.created_at DESC LIMIT 20`;
    properties=rows;
    itemContext=JSON.stringify({advisorScope:"system",language,instructions:`These are the complete matching search results for the user's latest request. Only recommend rows in searchResults. Titles beginning [DEMO] are fictional demo data: explicitly label them DEMO, not real offers. Copy title, slug, price, currency, bedrooms and bathrooms exactly. If searchResults is empty, clearly say no matching property was found. Never invent or rename a listing. Always answer in ${languageNames[language]}.`,searchCriteria:intent,searchResults:rows});
  }
  if(!apiKey)return json({error:"The AI assistant is not configured yet."},503);
  // Include authoritative results in the conversation as well: marketplace-chat
  // deployments may not forward item_context to the underlying model.
  const groundedMessages=itemContext?messages.map((message,index)=>index===messages.length-1?{...message,content:`${message.content}\n\nReply in plain text. Do not output image Markdown, HTML, or invent media URLs. The interface already displays database photos, detail links and videos in property cards. Published database search context (use these results for this answer):\n${itemContext}`}:message):messages;
  const result=await schoolsAiChat(apiKey,{session:(body.session||crypto.randomUUID()).slice(0,120),messages:groundedMessages,...(itemContext?{item_context:itemContext}:{})});
  const reply=cleanAdvisorText(String(result.reply||result.message||""));
  if(!reply)return json({error:"The AI advisor returned an empty response."},502);
  return json({reply,properties:properties.map(p=>({...p,videoUrl:safeVideoUrl(p.videoUrl)})),scope,agencySlug:agencySlug||null});
}catch(error){console.error("ai.chat",error);return json({error:"The AI advisor is temporarily unavailable."},502)}};
